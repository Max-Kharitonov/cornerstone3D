import {
  CornerstoneWadoWebWorkerTaskOptions,
  CornerstoneWadoWorkerTaskTypes,
} from '../imageLoader/webWorkerManager';
import calculateMinMax from '../shared/calculateMinMax';
import decodeImageFrame from '../shared/decodeImageFrame';
import { initialize as initializeJPEG2000 } from '../shared/decoders/decodeJPEG2000';
import { initialize as initializeJPEGLS } from '../shared/decoders/decodeJPEGLS';
import { CornerstoneWadoImageFrame } from '../shared/image-frame';
import { CornerstoneWadoWebWorkerDecodeData } from './webworker-messages';

// the configuration object for the decodeTask
let decodeConfig: CornerstoneWadoWebWorkerTaskOptions;

/**
 * Function to control loading and initializing the codecs
 * @param config
 */
function loadCodecs(config: CornerstoneWadoWebWorkerTaskOptions) {
  // Initialize the codecs
  if (config.decodeTask.initializeCodecsOnStartup) {
    initializeJPEG2000(config.decodeTask);
    initializeJPEGLS(config.decodeTask);
  }
}

/**
 * Task initialization function
 */
function initialize(config: CornerstoneWadoWebWorkerTaskOptions): void {
  decodeConfig = config;

  loadCodecs(config);
}

/**
 * Task handler function
 */
function handler(
  data: CornerstoneWadoWebWorkerDecodeData,
  doneCallback: (
    imageFrame: CornerstoneWadoImageFrame,
    pixelData: Transferable[]
  ) => void
): void {
  // Load the codecs if they aren't already loaded
  loadCodecs(decodeConfig);

  const strict =
    decodeConfig && decodeConfig.decodeTask && decodeConfig.decodeTask.strict;

  // convert pixel data from ArrayBuffer to Uint8Array since web workers support passing ArrayBuffers but
  // not typed arrays
  const pixelData = new Uint8Array(data.data.pixelData);

  // TODO switch to promise
  function finishedCallback(imageFrame: CornerstoneWadoImageFrame) {
    if (!imageFrame.pixelData) {
      throw new Error(
        'decodeTask: imageFrame.pixelData is undefined after decoding'
      );
    }

    calculateMinMax(imageFrame, strict);

    /** @todo check as any */
    // convert from TypedArray to ArrayBuffer since web workers support passing ArrayBuffers but not
    // typed arrays
    imageFrame.pixelData = imageFrame.pixelData.buffer as any;

    // invoke the callback with our result and pass the pixelData in the transferList to move it to
    // UI thread without making a copy

    // ONLY USING setTIMEOUT for TESTING>.. REMOVE THIS
    // setTimeout(() => {
    doneCallback(imageFrame, [imageFrame.pixelData]);
    // }, 100);
  }

  decodeImageFrame(
    data.data.imageFrame,
    data.data.transferSyntax,
    pixelData,
    decodeConfig.decodeTask,
    data.data.options,
    finishedCallback
  );
}

export default {
  taskType: 'decodeTask' as CornerstoneWadoWorkerTaskTypes,
  handler,
  initialize,
};
