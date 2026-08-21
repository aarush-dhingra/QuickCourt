import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { Facility } from "../venues/facility.model";
import { Court } from "../venues/court.model";
import {
  NotFoundError,
  ForbiddenError,
} from "../../utils/errors";
import {
  CreateFacilityInput,
  UpdateFacilityInput,
} from "./facilityOwner.facility.validation";

export class FacilityOwnerFacilityService {
  // ---------------------------------------------------------------------------
  // List — all non-deleted facilities for this owner
  // ---------------------------------------------------------------------------
  /**
   * Returns all facilities owned by `ownerId` that have not been soft-deleted.
   */
  static async listFacilities(ownerId: string) {
    const facilities = await Facility.find({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    return facilities.map((f) => ({
      id: f._id,
      name: f.name,
      description: f.description,
      location: f.location,
      address: f.address,
      sports: f.sports,
      amenities: f.amenities,
      photos: f.photos,
      approvalStatus: f.approvalStatus,
      isActive: f.isActive,
      rating: f.rating,
      reviewCount: f.reviewCount,
      bookingCount: f.bookingCount,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  }

  // ---------------------------------------------------------------------------
  // Get one — with ownership assertion
  // ---------------------------------------------------------------------------
  /**
   * Fetches a single facility, asserting it exists, is not soft-deleted,
   * and belongs to `ownerId`.
   */
  static async getFacilityById(ownerId: string, facilityId: string) {
    const facility = await Facility.findById(facilityId).lean();

    if (!facility || facility.deletedAt !== null) {
      throw new NotFoundError("Facility not found", "FACILITY_NOT_FOUND");
    }
    if (facility.ownerId.toString() !== ownerId) {
      throw new ForbiddenError("You do not own this facility");
    }

    return {
      id: facility._id,
      name: facility.name,
      description: facility.description,
      location: facility.location,
      address: facility.address,
      sports: facility.sports,
      amenities: facility.amenities,
      photos: facility.photos,
      approvalStatus: facility.approvalStatus,
      isActive: facility.isActive,
      rating: facility.rating,
      reviewCount: facility.reviewCount,
      bookingCount: facility.bookingCount,
      updatedBy: facility.updatedBy,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------
  /**
   * Creates a new facility for the owner. New facilities start with
   * `approvalStatus = "PENDING"` and must be approved by an admin before
   * becoming bookable.
   *
   * @param photoUrls - Public URL paths of already-uploaded photo files
   */
  static async createFacility(
    ownerId: string,
    input: CreateFacilityInput,
    photoUrls: string[]
  ) {
    const facility = await Facility.create({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      name: input.name,
      description: input.description,
      location: input.location,
      address: input.address,
      sports: input.sports,
      amenities: input.amenities,
      photos: photoUrls,
      approvalStatus: "PENDING",
      isActive: true,
      deletedAt: null,
      updatedBy: new mongoose.Types.ObjectId(ownerId),
    });

    return {
      id: facility._id,
      name: facility.name,
      location: facility.location,
      approvalStatus: facility.approvalStatus,
      photos: facility.photos,
      createdAt: facility.createdAt,
      message:
        "Facility created successfully. It will become bookable after admin approval.",
    };
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  /**
   * Updates a facility owned by `ownerId`.
   * - Merges new uploaded photos with existing ones.
   * - Removes photos listed in `input.removePhotos` (also deletes from disk).
   * - Sets `updatedBy` for audit trail.
   */
  static async updateFacility(
    ownerId: string,
    facilityId: string,
    input: UpdateFacilityInput,
    newPhotoUrls: string[]
  ) {
    const facility = await Facility.findById(facilityId);

    if (!facility || facility.deletedAt !== null) {
      throw new NotFoundError("Facility not found", "FACILITY_NOT_FOUND");
    }
    if (facility.ownerId.toString() !== ownerId) {
      throw new ForbiddenError("You do not own this facility");
    }

    // --- Photo management ---
    let currentPhotos = [...facility.photos];

    if (input.removePhotos && input.removePhotos.length > 0) {
      // Remove files from disk (best-effort — ignore missing files)
      for (const photoUrl of input.removePhotos) {
        const diskPath = path.join(
          process.cwd(),
          photoUrl.replace(/^\//, "")
        );
        if (fs.existsSync(diskPath)) {
          try {
            fs.unlinkSync(diskPath);
          } catch (err) {
            console.warn(`[Upload] Could not delete file: ${diskPath}`, err);
          }
        }
      }
      currentPhotos = currentPhotos.filter(
        (p) => !input.removePhotos!.includes(p)
      );
    }

    const updatedPhotos = [...currentPhotos, ...newPhotoUrls];

    // --- Field updates ---
    if (input.name !== undefined) facility.name = input.name;
    if (input.description !== undefined) facility.description = input.description;
    if (input.location !== undefined) facility.location = input.location;
    if (input.address !== undefined) facility.address = input.address;
    if (input.sports !== undefined) facility.sports = input.sports;
    if (input.amenities !== undefined) facility.amenities = input.amenities;
    facility.photos = updatedPhotos;
    facility.updatedBy = new mongoose.Types.ObjectId(ownerId);

    await facility.save();

    return {
      id: facility._id,
      name: facility.name,
      description: facility.description,
      location: facility.location,
      address: facility.address,
      sports: facility.sports,
      amenities: facility.amenities,
      photos: facility.photos,
      updatedAt: facility.updatedAt,
      updatedBy: facility.updatedBy,
    };
  }

  // ---------------------------------------------------------------------------
  // Soft Delete
  // ---------------------------------------------------------------------------
  /**
   * Soft-deletes a facility by setting `isActive = false`, `deletedAt = now`,
   * and `updatedBy = ownerId`. The document is never hard-deleted.
   *
   * Also soft-deactivates all courts under this facility.
   */
  static async softDeleteFacility(ownerId: string, facilityId: string) {
    const facility = await Facility.findById(facilityId);

    if (!facility || facility.deletedAt !== null) {
      throw new NotFoundError("Facility not found", "FACILITY_NOT_FOUND");
    }
    if (facility.ownerId.toString() !== ownerId) {
      throw new ForbiddenError("You do not own this facility");
    }

    const now = new Date();

    facility.isActive = false;
    facility.deletedAt = now;
    facility.updatedBy = new mongoose.Types.ObjectId(ownerId);
    await facility.save();

    // Cascade-deactivate all courts under this facility
    await Court.updateMany(
      { facilityId: new mongoose.Types.ObjectId(facilityId) },
      { isActive: false }
    );

    return {
      message: "Facility deactivated successfully.",
      deletedAt: now,
    };
  }
}
