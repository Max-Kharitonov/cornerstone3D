import {
  RenderingEngine,
  Types,
  Enums,
  getWebWorkerManager,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
  addButtonToToolbar,
  ctVoiRange,
} from '../../../../utils/demo/helpers';

console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const { ViewportType } = Enums;

// ======== Constants ======= //
const renderingEngineId = 'myRenderingEngine';
const viewportId = 'CT_STACK';

// ======== Set up page ======== //
setTitleAndDescription(
  'Web Worker API',
  'This text demonstrates how to run tasks (functions) off the main thread. There is a button in the toolbar that will run a heavy task (just a timeout to simulate a heavy task) off the main thread. While the task is running, the UI will not be blocked. You can interact with the text (e.g., select it) and the viewport.'
);

const content = document.getElementById('content');
const element = document.createElement('div');
element.id = 'cornerstone-element';
element.style.width = '500px';
element.style.height = '500px';

const FibResult = document.createElement('div');
FibResult.id = 'fib-result';

const sleepResult = document.createElement('div');
sleepResult.id = 'sleep-result';

content.appendChild(element);
content.appendChild(FibResult);
content.appendChild(sleepResult);

// Register the task
const workerFn = () => {
  return new Worker(new URL('./heavyTask.js', import.meta.url), {
    name: 'test-worker', // name used by the browser to name the worker
  });
};

const workerManager = getWebWorkerManager();

const options = {
  // maxWorkerInstances: 1,
  // overwrite: false
  // autoTerminationOnIdle: 10000
};

workerManager.registerWorker('test-worker', workerFn, options);

addButtonToToolbar({
  title: 'Run a heavy task off the main thread',
  onClick: () => {
    document.getElementById(
      'sleep-result'
    ).innerText = `Running a heavy task off the main thread for 5 seconds...`;

    workerManager
      .executeTask('test-worker', 'sleep', { time: 5000 })
      .then((result) => {
        document.getElementById(
          'sleep-result'
        ).innerText = `Heavy task completed!`;
      })
      .catch((error) => {
        console.error('error', error);
      });
  },
});

addButtonToToolbar({
  title: 'Calculate Fibonacci number 43',
  onClick: () => {
    document.getElementById(
      'fib-result'
    ).innerText = `Calculating Fibonacci number 43...`;

    workerManager
      .executeTask('test-worker', 'fib', { value: 43 })
      .then((result) => {
        document.getElementById(
          'fib-result'
        ).innerText = `Fibonacci number 43 is ${result}`;
      })
      .catch((error) => {
        console.error('error', error);
      });
  },
});

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  // Get Cornerstone imageIds and fetch metadata into RAM
  const imageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
    SeriesInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
    wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
  });

  // Instantiate a rendering engine
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // Create a stack viewport

  const viewportInput = {
    viewportId,
    type: ViewportType.STACK,
    element,
    defaultOptions: {
      background: <Types.Point3>[0.2, 0, 0.2],
    },
  };

  renderingEngine.enableElement(viewportInput);

  // Get the stack viewport that was created
  const viewport = <Types.IStackViewport>(
    renderingEngine.getViewport(viewportId)
  );

  // Define a stack containing a few images
  const stack = [imageIds[0], imageIds[1], imageIds[2]];

  // Set the stack on the viewport
  await viewport.setStack(stack);

  // Set the VOI of the stack
  viewport.setProperties({ voiRange: ctVoiRange });

  // Render the image
  viewport.render();
}

run();