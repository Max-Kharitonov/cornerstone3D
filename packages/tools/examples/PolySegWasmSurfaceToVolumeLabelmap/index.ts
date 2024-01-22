import {
  RenderingEngine,
  Enums,
  setVolumesForViewports,
  volumeLoader,
  CONSTANTS,
  utilities,
  Types,
  geometryLoader,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
  setCtTransferFunctionForVolumeActor,
  addButtonToToolbar,
  addDropdownToToolbar,
  addToggleButtonToToolbar,
  createInfoSection,
  downloadSurfacesData,
} from '../../../../utils/demo/helpers';
import * as cornerstoneTools from '@cornerstonejs/tools';

// This is for debugging purposes
console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const {
  SegmentationDisplayTool,
  ToolGroupManager,
  Enums: csToolsEnums,
  segmentation,
  BrushTool,
  PanTool,
  ZoomTool,
  StackScrollMouseWheelTool,
  TrackballRotateTool,
} = cornerstoneTools;

setTitleAndDescription(
  'Surface to Volume Labelmap',
  'This demonstration showcases the usage of PolySEG WASM module to convert a surface to a labelmap. The labelmap can then be used for further processing, such as 3D rendering.'
);

const { MouseBindings } = csToolsEnums;
const { ViewportType } = Enums;

// Define a unique id for the volume
const volumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use
const volumeId = `${volumeLoaderScheme}:${volumeName}`; // VolumeId with loader id + volume id
const segmentationId = 'MY_SEGMENTATION_ID';

// ======== Set up page ======== //

const size = '500px';
const content = document.getElementById('content');
const viewportGrid = document.createElement('div');

viewportGrid.style.display = 'flex';
viewportGrid.style.display = 'flex';
viewportGrid.style.flexDirection = 'row';

const element1 = document.createElement('div');
const element2 = document.createElement('div');
const element3 = document.createElement('div');
element1.style.width = size;
element1.style.height = size;
element2.style.width = size;
element2.style.height = size;
element3.style.width = size;
element3.style.height = size;

// Disable right click context menu so we can have right click tools
element1.oncontextmenu = (e) => e.preventDefault();
element2.oncontextmenu = (e) => e.preventDefault();
element3.oncontextmenu = (e) => e.preventDefault();

viewportGrid.appendChild(element1);
viewportGrid.appendChild(element2);
viewportGrid.appendChild(element3);

content.appendChild(viewportGrid);

createInfoSection(content, { ordered: true })
  .addInstruction('Use the Brush Tool for segmentation in MPR viewports')
  .addInstruction(
    'Toggle between different segmentation tools like Sphere Brush and Eraser'
  )
  .addInstruction('Convert the labelmap to a 3D surface representation')
  .addInstruction('Manipulate the 3D view using the Trackball Rotate Tool')
  .addInstruction('Toggle the visibility of the 3D anatomy model');

// ============================= //
const toolGroupId = 'ToolGroup_MPR';
const toolGroupId2 = 'ToolGroup_3D';
let toolGroup1, toolGroup2;
let renderingEngine;
// Create the viewports
const viewportId1 = 'CT_AXIAL';
const viewportId2 = 'CT_SAGITTAL';
const viewportId3 = 'CT_3D';

const segmentIndexes = [1, 2, 3, 4, 5];

addButtonToToolbar({
  title: 'Convert surface to labelmap',
  onClick: async () => {
    // add the 3d representation to the 3d toolgroup
    await segmentation.addSegmentationRepresentations(toolGroupId2, [
      {
        segmentationId,
        type: csToolsEnums.SegmentationRepresentations.Labelmap,
        options: {
          polySeg: true,
        },
      },
    ]);
  },
});

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  // Add tools to Cornerstone3D
  cornerstoneTools.addTool(PanTool);
  cornerstoneTools.addTool(ZoomTool);
  cornerstoneTools.addTool(StackScrollMouseWheelTool);
  cornerstoneTools.addTool(SegmentationDisplayTool);
  cornerstoneTools.addTool(BrushTool);
  cornerstoneTools.addTool(TrackballRotateTool);

  // Define tool groups to add the segmentation display tool to
  toolGroup1 = ToolGroupManager.createToolGroup(toolGroupId);
  toolGroup2 = ToolGroupManager.createToolGroup(toolGroupId2);

  // Manipulation Tools
  toolGroup1.addTool(PanTool.toolName);
  toolGroup2.addTool(PanTool.toolName);
  toolGroup1.addTool(ZoomTool.toolName);
  toolGroup1.addTool(TrackballRotateTool.toolName);
  toolGroup1.addTool(StackScrollMouseWheelTool.toolName);
  toolGroup2.addTool(StackScrollMouseWheelTool.toolName);

  // Segmentation Tools
  toolGroup1.addTool(SegmentationDisplayTool.toolName);

  toolGroup2.addTool(SegmentationDisplayTool.toolName);
  toolGroup2.addTool(ZoomTool.toolName);

  // activations
  toolGroup1.setToolEnabled(SegmentationDisplayTool.toolName);
  toolGroup2.setToolEnabled(SegmentationDisplayTool.toolName);

  toolGroup1.setToolActive(TrackballRotateTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Primary, // Middle Click
      },
    ],
  });
  toolGroup1.setToolActive(ZoomTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Secondary, // Right Click
      },
    ],
  });
  toolGroup1.setToolActive(PanTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Auxiliary,
      },
    ],
  });
  toolGroup2.setToolActive(PanTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Auxiliary,
      },
    ],
  });
  // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
  // hook instead of mouse buttons, it does not need to assign any mouse button.
  toolGroup1.setToolActive(StackScrollMouseWheelTool.toolName);
  toolGroup2.setToolActive(StackScrollMouseWheelTool.toolName);
  toolGroup2.setToolActive(ZoomTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Secondary, // Right Click
      },
    ],
  });

  // Get Cornerstone imageIds for the source data and fetch metadata into RAM
  const imageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
    SeriesInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
    wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
  });

  // Define a volume in memory
  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });

  // Instantiate a rendering engine
  const renderingEngineId = 'myRenderingEngine';
  renderingEngine = new RenderingEngine(renderingEngineId);

  const viewportInputArray = [
    {
      viewportId: viewportId1,
      type: ViewportType.VOLUME_3D,
      element: element1,
      defaultOptions: {
        background: CONSTANTS.BACKGROUND_COLORS.slicer3D,
      },
    },
    {
      viewportId: viewportId2,
      type: ViewportType.ORTHOGRAPHIC,
      element: element2,
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);

  toolGroup1.addViewport(viewportId1, renderingEngineId);
  toolGroup2.addViewport(viewportId2, renderingEngineId);

  // Set the volume to load
  volume.load();

  // Set volumes on the viewports
  await setVolumesForViewports(
    renderingEngine,
    [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
    [viewportId2]
  );

  // // set the anatomy at first invisible
  // const volumeActor = renderingEngine.getViewport(viewportId3).getDefaultActor()
  //   .actor as Types.VolumeActor;
  // utilities.applyPreset(
  //   volumeActor,
  //   CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Bone')
  // );
  // volumeActor.setVisibility(false);

  const surfaces = await downloadSurfacesData();

  const geometryIds = surfaces.map((surface) => {
    const geometryId = surface.closedSurface.id;
    geometryLoader.createAndCacheGeometry(geometryId, {
      type: Enums.GeometryType.SURFACE,
      geometryData: surface.closedSurface as Types.PublicSurfaceData,
    });

    return geometryId;
  });

  // Add the segmentations to state
  segmentation.addSegmentations([
    {
      segmentationId,
      representation: {
        // The type of segmentation
        type: csToolsEnums.SegmentationRepresentations.Surface,
        // The actual segmentation data, in the case of contour geometry
        // this is a reference to the geometry data
        data: {
          geometryIds,
        },
      },
    },
  ]);

  // // Add the segmentation representation to the toolgroup
  await segmentation.addSegmentationRepresentations(toolGroupId, [
    {
      segmentationId,
      type: csToolsEnums.SegmentationRepresentations.Surface,
    },
  ]);

  // Render the image
  renderingEngine.renderViewports([viewportId1, viewportId2]);
}

run();