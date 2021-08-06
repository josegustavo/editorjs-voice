/**
 * Voice Tool for the Editor.js
 *
 * @author CodeX <team@codex.so>
 * @license MIT
 * @see {@link https://github.com/editor-js/audio}
 *
 * To developers.
 * To simplify Tool structure, we split it to 4 parts:
 *  1) index.js — main Tool's interface, public API and methods for working with data
 *  2) uploader.js — module that has methods for sending files via AJAX: from device, by URL or File pasting
 *  3) ui.js — module for UI manipulations: render, showing preloader, etc
 *  4) tunes.js — working with Block Tunes: render buttons, handle clicks
 *
 * For debug purposes there is a testing server
 * that can save uploaded files and return a Response {@link UploadResponseFormat}
 *
 *       $ node dev/server.js
 *
 * It will expose 8008 port, so you can pass http://localhost:8008 with the Tools config:
 *
 * audio: {
 *   class: VoiceRecord,
 *   config: {
 *     endpoints: {
 *       byFile: 'http://localhost:8008/uploadFile',
 *       byUrl: 'http://localhost:8008/fetchUrl',
 *     }
 *   },
 * },
 */

/**
 * @typedef {object} VoiceRecordData
 * @description Voice Tool's input and output data format
 * @property {boolean} withBorder - should audio be rendered with border
 * @property {boolean} withBackground - should audio be rendered with background
 * @property {boolean} stretched - should audio be stretched to full width of container
 * @property {object} file — Voice file data returned from backend
 * @property {string} file.url — audio URL
 */

// eslint-disable-next-line
import css from './index.css';
import Ui from './ui';
import ToolboxIcon from './svg/toolbox.svg';
import Uploader from './uploader';
import Recorder from './recorder';

/**
 * @typedef {object} VoiceConfig
 * @description Config supported by Tool
 * @property {object} endpoints - upload endpoints
 * @property {string} endpoints.byFile - upload by file
 * @property {string} endpoints.byUrl - upload by URL
 * @property {string} field - field name for uploaded audio
 * @property {string} types - available mime-types
 * @property {object} additionalRequestData - any data to send with requests
 * @property {object} additionalRequestHeaders - allows to pass custom headers with Request
 * @property {string} buttonContent - overrides for Select File button
 * @property {object} [uploader] - optional custom uploader
 * @property {function(File): Promise.<UploadResponseFormat>} [uploader.uploadByFile] - method that upload audio by File
 * @property {function(string): Promise.<UploadResponseFormat>} [uploader.uploadByUrl] - method that upload audio by URL
 */

/**
 * @typedef {object} UploadResponseFormat
 * @description This format expected from backend on file uploading
 * @property {number} success - 1 for successful uploading, 0 for failure
 * @property {object} file - Object with file data.
 *                           'url' is required,
 *                           also can contain any additional data that will be saved and passed back
 * @property {string} file.url - [Required] audio source URL
 */
export default class VoiceRecord {
  /**
   * Notify core that read-only mode is supported
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @returns {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      icon: ToolboxIcon,
      title: 'Voice',
    };
  }

  /**
   * @param {object} tool - tool properties got from editor.js
   * @param {VoiceRecordData} tool.data - previously saved data
   * @param {VoiceConfig} tool.config - user config for Tool
   * @param {object} tool.api - Editor.js API
   * @param {boolean} tool.readOnly - read-only mode flag
   */
  constructor({
    data,
    config,
    api,
    readOnly
  }) {
    this.api = api;
    this.readOnly = readOnly;

    /**
     * Tool's initial config
     */
    this.config = {
      endpoints: config.endpoints || '',
      additionalRequestData: config.additionalRequestData || {},
      additionalRequestHeaders: config.additionalRequestHeaders || {},
      field: config.field || 'audio',
      types: config.types || 'audio/*',
      buttonContent: config.buttonContent || '',
      uploader: config.uploader || undefined,
      recorder: config.recorder || undefined,
      actions: config.actions || [],
    };

    /**
     * Module for file uploading
     */
    this.uploader = new Uploader({
      config: this.config,
      onUpload: (response) => this.onUpload(response),
      onError: (error) => this.uploadingFailed(error),
    });

    this.recorder = new Recorder({
      config: this.config,
      onError: (error) => this.onRecorderFailed(error),
      onStarted: () => this.onRecorderStarted(),
      onTogglePaused: (isPaused) => this.onRecorderTogglePaused(isPaused),
      onUpdateTimer: (timer) => this.onRecorderUpdateTimer(timer),
      onStopped: (blob) => this.onRecorderStopped(blob),
    });

    /**
     * Module for working with UI
     */
    this.ui = new Ui({
      api,
      config: this.config,
      toggleRecording: () => this.recorder.toggleRecording(),
      togglePauseRecording: () => this.recorder.togglePauseRecording(),
      readOnly,
    });

    /**
     * Set saved state
     */
    this._data = {};
    this.data = data;
  }

  onRecorderStarted() {
    this.ui.setActive(true);
  }

  onRecorderUpdateTimer(value) {
    this.ui.updateTimer(value);
  }

  onRecorderStopped(blob) {
    this.uploader.uploadAudioBlob(blob, {
      onPreview: (src) => {
        this.ui.showPreloader(src);
      },
    });
  }

  onRecorderTogglePaused(value) {
    this.ui.togglePaused(value);
  }

  /**
   * Renders Block content
   *
   * @public
   *
   * @returns {HTMLDivElement}
   */
  render() {
    return this.ui.render(this.data);
  }

  /**
   * Return Block data
   *
   * @public
   *
   * @returns {VoiceRecordData}
   */
  save() {
    return this.data;
  }

  /**
   * Makes buttons with tunes: add background, add border, stretch audio
   *
   * @public
   *
   * @returns {Element}
   */

  /**
   * Fires after clicks on the Toolbox Voice Icon
   * Initiates click on the Select File button
   *
   * @public
   */
  appendCallback() {
    // this.ui.nodes.fileButton.click();
  }

  /**
   * Specify paste substitutes
   *
   * @see {@link https://github.com/codex-team/editor.js/blob/master/docs/tools.md#paste-handling}
   * @returns {{tags: string[], patterns: object<string, RegExp>, files: {extensions: string[], mimeTypes: string[]}}}
   */
  static get pasteConfig() {
    return {
      /**
       * Paste HTML into Editor
       */
      tags: ['img'],

      /**
       * Paste URL of audio into the Editor
       */
      patterns: {
        audio: /https?:\/\/\S+\.(mp3|wav|ogg)$/i,
      },

      /**
       * Drag n drop file from into the Editor
       */
      files: {
        mimeTypes: ['audio/*'],
      },
    };
  }

  /**
   * Specify paste handlers
   *
   * @public
   * @see {@link https://github.com/codex-team/editor.js/blob/master/docs/tools.md#paste-handling}
   * @param {CustomEvent} event - editor.js custom paste event
   *                              {@link https://github.com/codex-team/editor.js/blob/master/types/tools/paste-events.d.ts}
   * @returns {void}
   */
  async onPaste(event) {
    switch (event.type) {
      case 'tag': {
        const audio = event.detail.data;

        /** Voices from PDF */
        if (/^blob:/.test(audio.src)) {
          const response = await fetch(audio.src);
          const file = await response.blob();

          this.uploadFile(file);
          break;
        }

        this.uploadUrl(audio.src);
        break;
      }
      case 'pattern': {
        const url = event.detail.data;

        this.uploadUrl(url);
        break;
      }
      case 'file': {
        const file = event.detail.file;

        this.uploadFile(file);
        break;
      }
    }
  }

  /**
   * Private methods
   * ̿̿ ̿̿ ̿̿ ̿'̿'\̵͇̿̿\з= ( ▀ ͜͞ʖ▀) =ε/̵͇̿̿/’̿’̿ ̿ ̿̿ ̿̿ ̿̿
   */

  /**
   * Stores all Tool's data
   *
   * @private
   *
   * @param {VoiceRecordData} data - data in Voice Tool format
   */
  set data(data) {
    this.audio = data.file;

  }

  /**
   * Return Tool data
   *
   * @private
   *
   * @returns {VoiceRecordData}
   */
  get data() {
    return this._data;
  }

  /**
   * Set new audio file
   *
   * @private
   *
   * @param {object} file - uploaded file data
   */
  set audio(file) {
    this._data.file = file || {};

    if (file && file.url) {
      this.ui.fillVoice(file.url);
    }
  }

  /**
   * File uploading callback
   *
   * @private
   *
   * @param {UploadResponseFormat} response - uploading server response
   * @returns {void}
   */
  onUpload(response) {
    if (response.success && response.file) {
      this.audio = response.file;
    } else {
      this.uploadingFailed('incorrect response: ' + JSON.stringify(response));
    }
  }

  onRecorderFailed(errorText) {
    console.log('Voice Tool: recording failed because of', errorText);
    this.api.notifier.show({
      message: this.api.i18n.t('Couldn’t record. please give permission.'),
      style: 'error',
    });
    this.ui.togglePaused(false);
    this.ui.setActive(false);
    this.ui.hidePreloader();
  }

  /**
   * Handle uploader errors
   *
   * @private
   * @param {string} errorText - uploading error text
   * @returns {void}
   */
  uploadingFailed(errorText) {
    console.log('Voice Tool: uploading failed because of', errorText);

    this.api.notifier.show({
      message: this.api.i18n.t('Couldn’t upload audio. Please try another.'),
      style: 'error',
    });
    this.ui.togglePaused(false);
    this.ui.setActive(false);
    this.ui.hidePreloader();
  }

  /**
   * Callback fired when Block Tune is activated
   *
   * @private
   *
   * @param {string} tuneName - tune that has been clicked
   * @returns {void}
   */
  tuneToggled(tuneName) {
    // inverse tune state
    this.setTune(tuneName, !this._data[tuneName]);
  }

  /**
   * Show preloader and upload audio file
   *
   * @param {File} file - file that is currently uploading (from paste)
   * @returns {void}
   */
  uploadFile(file) {
    this.uploader.uploadByFile(file, {
      onPreview: (src) => {
        this.ui.showPreloader(src);
      },
    });
  }

  /**
   * Show preloader and upload audio by target url
   *
   * @param {string} url - url pasted
   * @returns {void}
   */
  uploadUrl(url) {
    this.ui.showPreloader(url);
    this.uploader.uploadByUrl(url);
  }
}
