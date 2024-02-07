import { cache, utilities } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { isVolumeSegmentation } from './stackVolumeCheck';
import { LabelmapToolOperationDataStack } from '../../../../types';

const { VoxelManager } = utilities;

function getStrategyData({ operationData, viewport }) {
  let segmentationImageData, segmentationScalarData, imageScalarData;
  let dimensions: Types.Point3;
  let segmentationVoxelManager;
  let numComps = 1;
  let imageVoxelManager;

  if (isVolumeSegmentation(operationData)) {
    const { volumeId, referencedVolumeId } = operationData;

    const segmentationVolume = cache.getVolume(volumeId);
    const imageVolume = cache.getVolume(referencedVolumeId);

    if (!segmentationVolume || !imageVolume) {
      return;
    }

    ({ imageData: segmentationImageData } = segmentationVolume);
    segmentationScalarData = segmentationVolume.getScalarData();
    imageScalarData = imageVolume.getScalarData();
    dimensions = imageVolume.dimensions;
  } else {
    const { imageIdReferenceMap, segmentationRepresentationUID } =
      operationData as LabelmapToolOperationDataStack;

    if (!imageIdReferenceMap) {
      return;
    }

    const currentImageId = viewport.getCurrentImageId();
    if (!currentImageId) {
      return;
    }

    // we know that the segmentationRepresentationUID is the name of the actor always
    // and always circle modifies the current imageId which in fact is the imageData
    // of that actor at that moment so we have the imageData already
    const actor = viewport.getActor(segmentationRepresentationUID);
    if (!actor) {
      return;
    }
    segmentationImageData = actor.actor.getMapper().getInputData();
    segmentationVoxelManager = segmentationImageData.voxelManager;
    const currentSegmentationImageId = imageIdReferenceMap.get(currentImageId);

    const segmentationImage = cache.getImage(currentSegmentationImageId);
    segmentationScalarData = segmentationImage.getPixelData();

    const image = cache.getImage(currentImageId);
    const imageData = image ? null : viewport.getImageData();

    // VERY IMPORTANT
    // This is the pixel data of the image that is being segmented in the cache
    // and we need to use this to for the modification
    imageScalarData = image?.getPixelData() || imageData.getScalarData();
    dimensions = image ? [image.columns, image.rows, 1] : imageData.dimensions;
    imageVoxelManager = image?.voxelManager;
    numComps =
      image?.numComps || imageScalarData.length / dimensions[0] / dimensions[1];
  }

  return {
    segmentationImageData,
    segmentationScalarData,
    segmentationVoxelManager:
      segmentationVoxelManager ||
      VoxelManager.createVolumeVoxelManager(dimensions, segmentationScalarData),
    imageScalarData,
    imageVoxelManager: VoxelManager.createVolumeVoxelManager(
      dimensions,
      imageScalarData,
      numComps
    ),
  };
}

export { getStrategyData };
