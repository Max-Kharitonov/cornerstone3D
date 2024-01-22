import { Enums, Types, geometryLoader } from '@cornerstonejs/core';
import { getColorForSegmentIndex } from '../../config/segmentationColor';
import {
  findSegmentationRepresentationByUID,
  getSegmentation,
} from '../../segmentationState';
import { RawSurfacesData } from './surfaceComputationStrategies';

/**
 * Creates and caches surfaces from raw surface data.
 *
 * @param segmentationId - The ID of the segmentation.
 * @param rawSurfacesData - The raw surface data.
 * @param options - Additional options for creating and caching surfaces.
 * @param options.segmentIndices - An array of segment indices.
 * @param options.segmentationRepresentationUID - The UID of the segmentation representation.
 * @returns An object containing the IDs of the created surfaces.
 */
export async function createAndCacheSurfacesFromRaw(
  segmentationId: string,
  rawSurfacesData: RawSurfacesData,
  options: {
    segmentIndices?: number[];
    segmentationRepresentationUID?: string;
  } = {}
) {
  let segmentationRepresentation, toolGroupId;
  if (options.segmentationRepresentationUID) {
    ({ segmentationRepresentation, toolGroupId } =
      findSegmentationRepresentationByUID(
        options.segmentationRepresentationUID
      ));
  }

  const segmentation = getSegmentation(segmentationId);

  const geometryIds = [];
  const promises = Object.keys(rawSurfacesData).map((index) => {
    const rawSurfaceData = rawSurfacesData[index];
    const segmentIndex = rawSurfaceData.segmentIndex;

    let color;
    if (segmentationRepresentation) {
      color = getColorForSegmentIndex(
        toolGroupId,
        segmentationRepresentation.segmentationRepresentationUID,
        segmentIndex
      ).slice(0, 3);
    } else {
      color = [Math.random() * 255, Math.random() * 255, Math.random() * 255];
    }

    const closedSurface = {
      id: `segmentation_${segmentation.segmentationId}_surface_${segmentIndex}`,
      color,
      frameOfReferenceUID: 'test-frameOfReferenceUID',
      data: {
        points: rawSurfaceData.data.points,
        polys: rawSurfaceData.data.polys,
      },
    };

    geometryIds.push(closedSurface.id);

    const geometryId = closedSurface.id;
    return geometryLoader.createAndCacheGeometry(geometryId, {
      type: Enums.GeometryType.SURFACE,
      geometryData: closedSurface as Types.PublicSurfaceData,
    });
  });

  await Promise.all(promises);

  return {
    geometryIds,
  };
}