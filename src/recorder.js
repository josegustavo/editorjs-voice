import ajax from '@codexteam/ajax';

/**
 * Module for file uploading. Handle 3 scenarios:
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
    onError
  }) {
    this.config = config;
    this.onError = onError;
  }

  /**
   * Handle clicks on the upload file button
   * Fires ajax.transport()
   *
   * @param {Function} onPreview - callback fired when preview is ready
   */
  toggleRecording({ onPreview, onStarted, onPaused }) {

    onStarted && onStarted();

    const preparePreview = function (file) {
      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onload = (e) => {
        onPreview(e.target.result);
      };
    };

    /**
     * Custom uploading
     * or default uploading
     */
    let upload;

    // custom uploading
    if (this.config.recorder && typeof this.config.recorder.uploadByFile === 'function') {
      upload = ajax.selectFiles({ accept: this.config.types })
        .then((files) => {
          preparePreview(files[0]);

          const customUpload = this.config.recorder.uploadByFile(files[0]);

          if (!isPromise(customUpload)) {
            console.warn('Custom recorder method uploadByFile should return a Promise');
          }

          return customUpload;
        });

      // default uploading
    } else {
      upload = ajax.transport({
        url: this.config.endpoints.byFile,
        data: this.config.additionalRequestData,
        accept: this.config.types,
        headers: this.config.additionalRequestHeaders,
        beforeSend: (files) => {
          preparePreview(files[0]);
        },
        fieldName: this.config.field,
      })
        .then((response) => response.body);
    }

    upload.then((response) => {
      this.onUpload(response);
    })
      .catch((error) => {
        this.onError(error);
      });
  }

  /**
   * Handle clicks on the upload file button
   * Fires ajax.post()
   *
   * @param {string} url - image source url
   */
  uploadByUrl(url) {
    let upload;

    /**
     * Custom uploading
     */
    if (this.config.recorder && typeof this.config.recorder.uploadByUrl === 'function') {
      upload = this.config.recorder.uploadByUrl(url);

      if (!isPromise(upload)) {
        console.warn('Custom recorder method uploadByUrl should return a Promise');
      }
    } else {
      /**
       * Default uploading
       */
      upload = ajax.post({
        url: this.config.endpoints.byUrl,
        data: Object.assign({
          url: url,
        }, this.config.additionalRequestData),
        type: ajax.contentType.JSON,
        headers: this.config.additionalRequestHeaders,
      })
        .then(response => response.body);
    }

    upload.then((response) => {
      this.onUpload(response);
    })
      .catch((error) => {
        this.onError(error);
      });
  }

  /**
   * Handle clicks on the upload file button
   * Fires ajax.post()
   *
   * @param {File} file - file pasted by drag-n-drop
   * @param {Function} onPreview - file pasted by drag-n-drop
   */
  uploadByFile(file, { onPreview }) {
    /**
     * Load file for preview
     *
     * @type {FileReader}
     */
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = (e) => {
      onPreview(e.target.result);
    };

    let upload;

    /**
     * Custom uploading
     */
    if (this.config.recorder && typeof this.config.recorder.uploadByFile === 'function') {
      upload = this.config.recorder.uploadByFile(file);

      if (!isPromise(upload)) {
        console.warn('Custom recorder method uploadByFile should return a Promise');
      }
    } else {
      /**
       * Default uploading
       */
      const formData = new FormData();

      formData.append(this.config.field, file);

      if (this.config.additionalRequestData && Object.keys(this.config.additionalRequestData).length) {
        Object.entries(this.config.additionalRequestData)
          .forEach(([name, value]) => {
            formData.append(name, value);
          });
      }

      upload = ajax.post({
        url: this.config.endpoints.byFile,
        data: formData,
        type: ajax.contentType.JSON,
        headers: this.config.additionalRequestHeaders,
      })
        .then(response => response.body);
    }

    upload.then((response) => {
      this.onUpload(response);
    })
      .catch((error) => {
        this.onError(error);
      });
  }
}

/**
 * Check if passed object is a Promise
 *
 * @param  {*}  object - object to check
 * @returns {boolean}
 */
function isPromise(object) {
  return Promise.resolve(object) === object;
}
