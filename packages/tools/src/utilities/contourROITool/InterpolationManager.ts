import {
  getEnabledElements,
  Types,
  utilities as csUtils,
  StackViewport,
  VolumeViewport,
  getRenderingEngine,
} from '@cornerstonejs/core';
import {
  AnnotationLabelChangeEventType,
  AnnotationModifiedEventType,
  AnnotationRemovedEventType,
} from '../../types/EventTypes';
import getInterpolationDataCollection from './Interpolation/getInterpolationDataCollection';
import type { InterpolationViewportData } from './Interpolation/InterpolationTypes';
import interpolate from './Interpolation/freehandInterpolate/interpolate';
import updateRelatedAnnotations from './Interpolation/updateRelatedAnnotations';
import deleteRelatedAnnotations from './Interpolation/deleteRelatedAnnotations';
import { InterpolationROIAnnotation } from '../../types/ToolSpecificAnnotationTypes';
const { uuidv4, getImageSliceDataForVolumeViewport, isEqual } = csUtils;

function getSliceData(viewport, referencedImageId): Types.ImageSliceData {
  let sliceData: Types.ImageSliceData = { numberOfSlices: 0, imageIndex: 0 };
  if (viewport instanceof VolumeViewport) {
    sliceData = getImageSliceDataForVolumeViewport(viewport);
  } else if (viewport instanceof StackViewport) {
    const imageIds = viewport.getImageIds();
    sliceData.numberOfSlices = imageIds.length;
    sliceData.imageIndex = imageIds.findIndex((x) => x === referencedImageId);
  }
  return sliceData;
}

function getMatchingViewport(annotation: InterpolationROIAnnotation) {
  const { metadata } = annotation;
  const enabledElement = getEnabledElements().find((enabledElement) => {
    if (enabledElement.FrameOfReferenceUID === metadata.FrameOfReferenceUID) {
      const viewport = enabledElement.viewport;
      const { viewPlaneNormal, viewUp } = viewport.getCamera();
      return (
        isEqual(viewPlaneNormal, metadata.viewPlaneNormal) &&
        isEqual(viewUp, metadata.viewUp)
      );
    }
    return;
  });
  return enabledElement?.viewport;
}

export default class InterpolationManager {
  static toolNames = [];

  static addTool(toolName: string) {
    if (-1 === this.toolNames.indexOf(toolName)) {
      this.toolNames.push(toolName);
    }
  }

  static handleAnnotationLabelChange = (
    evt: AnnotationLabelChangeEventType
  ) => {
    const { renderingEngineId, viewportId } = evt.detail;
    const annotation = evt.detail.annotation as InterpolationROIAnnotation;
    const { toolName } = annotation.metadata;

    if (-1 === this.toolNames.indexOf(toolName)) {
      return;
    }

    const renderingEngine = getRenderingEngine(renderingEngineId);
    const viewport = renderingEngine.getViewport(viewportId);
    const sliceData: Types.ImageSliceData = getSliceData(
      viewport,
      annotation.metadata.referencedImageId
    );
    const viewportData: InterpolationViewportData = {
      viewport,
      sliceData,
      annotation,
      interpolationUID: annotation.interpolationUID,
    };
    const isInitializeLabel = !annotation.interpolationUID;
    // If any update, triggered on an annotation, then it will be treated as non-autogenerated.
    annotation.autoGenerated = false;
    if (!isInitializeLabel) {
      updateRelatedAnnotations(viewportData, true);
    }
    if (!annotation.interpolationUID) {
      const filterData = [
        { key: 'label', value: annotation.data.label, parentKey: 'data' },
        {
          key: 'viewPlaneNormal',
          value: annotation.metadata.viewPlaneNormal,
          parentKey: 'metadata',
        },
        {
          key: 'viewUp',
          value: annotation.metadata.viewUp,
          parentKey: 'metadata',
        },
      ];
      let interpolationAnnotations = getInterpolationDataCollection(
        viewportData,
        filterData,
        true
      );
      // Skip other type of annotations with same location
      interpolationAnnotations = interpolationAnnotations.filter(
        (interpolationAnnotation) => interpolationAnnotation.interpolationUID
      );
      if (!annotation.interpolationUID) {
        annotation.interpolationUID =
          interpolationAnnotations[0]?.interpolationUID || uuidv4();
        viewportData.interpolationUID = annotation.interpolationUID;
      }
      interpolate(viewportData);
    }
  };

  static handleAnnotationUpdate = (evt: AnnotationModifiedEventType) => {
    const { renderingEngineId, viewportId } = evt.detail;
    const annotation = evt.detail.annotation as InterpolationROIAnnotation;
    const { toolName } = annotation.metadata;

    if (-1 === this.toolNames.indexOf(toolName)) {
      return;
    }

    const renderingEngine = getRenderingEngine(renderingEngineId);
    const viewport = renderingEngine.getViewport(viewportId);
    const sliceData: Types.ImageSliceData = getSliceData(
      viewport,
      annotation.metadata.referencedImageId
    );
    const viewportData: InterpolationViewportData = {
      viewport,
      sliceData,
      annotation,
      interpolationUID: annotation.interpolationUID,
    };
    // If any update, triggered on an annotation, then it will be treated as non-autogenerated.
    annotation.autoGenerated = false;
    updateRelatedAnnotations(viewportData, false);
  };

  static handleAnnotationDelete = (evt: AnnotationRemovedEventType) => {
    const annotation = evt.detail.annotation as InterpolationROIAnnotation;
    const { toolName } = annotation.metadata;

    if (-1 === this.toolNames.indexOf(toolName)) {
      return;
    }
    const viewport = getMatchingViewport(annotation);

    if (!viewport) {
      return;
    }

    const sliceData: Types.ImageSliceData = getSliceData(
      viewport,
      annotation.metadata.referencedImageId
    );
    const viewportData: InterpolationViewportData = {
      viewport,
      sliceData,
      annotation,
      interpolationUID: annotation.interpolationUID,
    };
    // If any update, triggered on an annotation, then it will be treated as non-interpolated.
    annotation.autoGenerated = false;
    deleteRelatedAnnotations(viewportData);
  };
}