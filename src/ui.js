import recordIcon from './svg/record-icon.svg';
import pausedIcon from './svg/paused-icon.svg';

/**
 * Class for working with UI:
 *  - rendering base structure
 *  - show/hide preview
 *  - apply tune view
 */
export default class Ui {
  /**
   * @param {object} ui - voice tool Ui module
   * @param {object} ui.api - Editor.js API
   * @param {VoiceConfig} ui.config - user config
   * @param {Function} ui.onSelectFile - callback for clicks on Select file button
   * @param {boolean} ui.readOnly - read-only mode flag
   */
  constructor({
    api,
    config,
    toggleRecording,
    togglePauseRecording,
    readOnly
  }) {
    this.api = api;
    this.config = config;
    this.toggleRecording = toggleRecording;
    this.togglePauseRecording = togglePauseRecording;
    this.readOnly = readOnly;
    const timerComponent = this.createTimerElement();
    const btnPaused = this.createBtnPausedElement();
    this.nodes = {
      wrapper: make('div', [this.CSS.baseClass, this.CSS.wrapper]),
      audioContainer: make('div', [this.CSS.audioContainer]),
      timerComponent,
      btnPaused,
      recordComponent: this.createRecordComponent(timerComponent, btnPaused),
      audioEl: undefined,
      voicePreloader: make('div', this.CSS.voicePreloader),
    };

    /**
     * Create base structure
     *  <wrapper>
     *    <voice-container>
     *      <voice-preloader />
     *    </voice-container>
     *    <select-file-button />
     *  </wrapper>
     */
    this.nodes.audioContainer.appendChild(this.nodes.voicePreloader);
    this.nodes.wrapper.appendChild(this.nodes.audioContainer);
    this.nodes.wrapper.appendChild(this.nodes.recordComponent);
  }

  /**
   * CSS classes
   *
   * @returns {object}
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,

      recordComponent: 'voice-tool__record-component',

      /**
       * Tool's classes
       */
      wrapper: 'voice-tool',
      audioContainer: 'voice-tool__voice',
      voicePreloader: 'voice-tool__voice-preloader',
      audioEl: 'voice-tool__voice-picture',
    };
  };

  /**
   * Ui statuses:
   * - empty
   * - uploading
   * - filled
   *
   * @returns {{EMPTY: string, UPLOADING: string, FILLED: string}}
   */
  static get status() {
    return {
      EMPTY: 'empty',
      UPLOADING: 'loading',
      FILLED: 'filled',
    };
  }

  /**
   * Renders tool UI
   *
   * @param {VoiceRecordData} toolData - saved tool data
   * @returns {Element}
   */
  render(toolData) {
    if (!toolData.file || Object.keys(toolData.file).length === 0) {
      this.toggleStatus(Ui.status.EMPTY);
    } else {
      this.toggleStatus(Ui.status.UPLOADING);
    }

    return this.nodes.wrapper;
  }

  /**
   * Creates timmer element
   *
   * @returns {Element}
   */
  createTimerElement() {
    const recordTimer = make('div', ['record-timer']);
    recordTimer.innerHTML = '00:00';
    return recordTimer;
  }

  createBtnPausedElement() {
    const btnPaused = make('button', ['btn-pause-record']);
    btnPaused.innerHTML = '<i class="icn-pause-record">' + pausedIcon + '</i>';
    btnPaused.addEventListener('click', () => {
      this.togglePauseRecording && this.togglePauseRecording();
    });
    return btnPaused;
  }

  /**
   * Creates upload-file button
   *
   * @returns {Element}
   */
  createRecordComponent(recordTimer, btnPaused) {

    const recordComponent = make('div', [this.CSS.recordComponent]);

    const btnRecord = make('div', ['btn-record']);

    const icnRecord = make('i', ['icn-record']);

    icnRecord.innerHTML = '<i class="icn-record-inner"></i>' + recordIcon;

    const processingInfo = make('div', ['processing-info']);

    processingInfo.innerHTML = '<div class="processing-info-inner"></div>';

    const processingText = make('div', ['processing-text']);

    processingText.innerHTML = '<span class="the-text">Procesando...</span>';
    processingInfo.append(processingText);

    btnRecord.append(icnRecord);
    btnRecord.append(recordTimer);
    btnRecord.append(processingInfo);

    recordComponent.append(btnRecord);
    recordComponent.append(btnPaused);

    btnRecord.addEventListener('click', () => {
      this.toggleRecording && this.toggleRecording();
    });

    return recordComponent;
  }

  updateTimer(value) {
    this.nodes.timerComponent.innerHTML = value;
  }

  /**
   * Shows uploading preloader
   *
   * @param {string} src - preview source
   * @returns {void}
   */
  showPreloader(src) {
    // this.nodes.voicePreloader.innerHTML = src;
    this.toggleStatus(Ui.status.UPLOADING);
  }

  /**
   * Hide uploading preloader
   *
   * @returns {void}
   */
  hidePreloader() {
    this.nodes.voicePreloader.style.backgroundVoice = '';
    this.toggleStatus(Ui.status.EMPTY);
  }

  /**
   * Shows an voice
   *
   * @param {string} url - voice source
   * @returns {void}
   */
  fillVoice(url) {
    /**
     * Check for a source extension to compose element correctly: video tag for mp4, img — for others
     */
    const tag = 'AUDIO';

    const attributes = {
      src: url,
      controls: true
    };

    /**
     * We use eventName variable because IMG and VIDEO tags have different event to be called on source load
     * - IMG: load
     * - VIDEO: loadeddata
     *
     * @type {string}
     */
    let eventName = 'loadeddata';
    /**
     * Compose tag with defined attributes
     *
     * @type {Element}
     */
    this.nodes.audioEl = make(tag, this.CSS.audioEl, attributes);

    /**
     * Add load event listener
     */
    this.nodes.audioEl.addEventListener(eventName, () => {
      this.toggleStatus(Ui.status.FILLED);

      /**
       * Preloader does not exists on first rendering with presaved data
       */
      if (this.nodes.voicePreloader) {
        this.nodes.voicePreloader.style.backgroundVoice = '';
      }
    });

    this.nodes.audioContainer.appendChild(this.nodes.audioEl);
  }

  /**
   * Changes UI status
   *
   * @param {string} status - see {@link Ui.status} constants
   * @returns {void}
   */
  toggleStatus(status) {
    for (const statusType in Ui.status) {
      if (Object.prototype.hasOwnProperty.call(Ui.status, statusType)) {
        this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${Ui.status[statusType]}`, status === Ui.status[statusType]);
      }
    }
  }

  setActive(isActive) {
    if (isActive) {
      this.nodes.recordComponent.classList.add('active');
    } else {
      this.nodes.recordComponent.classList.remove('active');
    }
  }

  togglePaused(isPaused) {
    if (isPaused) {
      this.nodes.recordComponent.classList.add('paused');
    } else {
      this.nodes.recordComponent.classList.remove('paused');
    }
  }

}

/**
 * Helper for making Elements with attributes
 *
 * @param  {string} tagName           - new Element tag name
 * @param  {Array|string} classNames  - list or name of CSS class
 * @param  {object} attributes        - any attributes
 * @returns {Element}
 */
export const make = function make(tagName, classNames = null, attributes = {}) {
  const el = document.createElement(tagName);

  if (Array.isArray(classNames)) {
    el.classList.add(...classNames);
  } else if (classNames) {
    el.classList.add(classNames);
  }

  for (const attrName in attributes) {
    el[attrName] = attributes[attrName];
  }

  return el;
};
