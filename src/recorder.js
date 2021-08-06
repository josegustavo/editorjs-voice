/**
 * Module for file recording. Handle 3 scenarios:
 *  1. Select file from device and upload
 *  2. Upload by pasting URL
 *  3. Upload by pasting file from Clipboard or by Drag'n'Drop
 */
export default class Recorder {
  /**
   * @param {object} params - recorder module params
   * @param {ImageConfig} params.config - image tool config
   * @param {Function} params.onUpload - one callback for all uploading (file, url, d-n-d, pasting)
   * @param {Function} params.onError - callback for uploading errors
   */
  constructor({
    config,
    onUpload,
    onError,
    onStarted,
    onStopped,
    onTogglePaused,
    onUpdateTimer
  }) {
    this.config = config;
    this.timeslice = 1000;
    this.onError = onError;
    this.onStarted = onStarted;
    this.onStopped = onStopped;
    this.onTogglePaused = onTogglePaused;
    this.onUpdateTimer = onUpdateTimer;

    this.mediaStream = null;
    this.mediaRecorder = null;
    this.timer = 0;
    this.recordedChunks = [];
  }

  addTimer(timeslice) {
    const zeroPad = (num, places) => String(num)
      .padStart(places, '0');
    this.timer += timeslice;
    const allSeconds = this.timer / 1000;
    const minutes = Math.floor(allSeconds / 60);
    const seconds = allSeconds % 60;
    const timer = `${zeroPad(minutes, 2)}:${zeroPad(seconds, 2)}`;
    this.onUpdateTimer && this.onUpdateTimer(timer);
  }

  getMediaStream() {
    return new Promise((resolve, reject) => {
      if (!this.mediaStream) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // console.info('getUserMedia supported.');
          navigator.mediaDevices.getUserMedia(
            // constraints - only audio needed for this app
            { audio: true })
            // Success callback
            .then((stream) => {
              this.mediaStream = stream;
              resolve(this.mediaStream);
            })
            // Error callback
            .catch((err) => {
              const msg = 'The following getUserMedia error occurred: ' + err;
              this.onError(msg);
              reject(new Error(msg));
            });
        } else {
          const msg = 'Not supported on your browser!';
          this.onError(msg);
          reject(new Error(msg));
        }
      } else {
        resolve(this.mediaStream);
      }
    });
  }

  getMediaRecorder() {
    const that = this;
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.getMediaStream()
          .then((stream) => {
            const options = { mimeType: 'audio/webm' };

            this.mediaRecorder = new MediaRecorder(stream, options);

            this.mediaRecorder.addEventListener('dataavailable', (e) => this.onDataAvailable(e));
            this.mediaRecorder.addEventListener('start', this.onStarted);
            this.mediaRecorder.addEventListener('stop', () => {
              const blob = new Blob(that.recordedChunks, { type: 'audio/ogg; codecs=opus' });
              that.onStopped(blob);
            });
            resolve(this.mediaRecorder);
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        resolve(this.mediaRecorder);
      }
    });
  }

  onDataAvailable(e) {
    if (e.data.size > 0) {
      this.recordedChunks.push(e.data);
    }
    this.addTimer(this.timeslice);
  }

  startRecording() {
    this.getMediaRecorder()
      .then((mediaRecorder) => {
        this.timer = 0;
        this.addTimer(0);
        this.recordedChunks = [];
        mediaRecorder.start(this.timeslice);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  togglePauseRecording() {
    this.getMediaRecorder()
      .then((mediaRecorder) => {
        if (mediaRecorder.state === 'paused') {
          mediaRecorder.resume();
          this.onTogglePaused && this.onTogglePaused(false);
        } else if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.pause();
          this.onTogglePaused && this.onTogglePaused(true);
        }
      });
  }

  stopRecording() {
    this.getMediaRecorder()
      .then((mediaRecorder) => {
        mediaRecorder.stop();
      });
  }

  /**
   * Handle clicks on the upload file button
   * Fires ajax.transport()
   *
   * @param {Function} onPreview - callback fired when preview is ready
   */
  toggleRecording() {
    this.getMediaRecorder()
      .then((mediaRecorder) => {
        if (mediaRecorder.state === 'inactive') {
          this.startRecording();
        } else {
          this.stopRecording();
        }
      });
  }
}
