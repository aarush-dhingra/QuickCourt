import mongoose from "mongoose";
import { env } from "../config/env";
import { User } from "../modules/users/user.model";
import { Facility } from "../modules/venues/facility.model";
import { Court } from "../modules/venues/court.model";
import { Booking } from "../modules/bookings/booking.model";
import { hashPassword } from "../utils/password";

const seed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Facility.deleteMany({}),
      Court.deleteMany({}),
      Booking.deleteMany({}),
    ]);
    console.log("Cleared existing data.");

    // Create users
    const passwordHash = await hashPassword("Password123!");

    const verifiedUser = await User.create({
      email: "user@quickcourt.com",
      passwordHash,
      fullName: "Test User",
      role: "USER",
      isEmailVerified: true,
      isActive: true,
    });

    const unverifiedUser = await User.create({
      email: "unverified@quickcourt.com",
      passwordHash,
      fullName: "Unverified User",
      role: "USER",
      isEmailVerified: false,
      isActive: true,
    });

    console.log(`Created users: ${verifiedUser.email}, ${unverifiedUser.email}`);

    // Create facilities
    const sports = ["BADMINTON", "FOOTBALL", "CRICKET", "TENNIS", "BASKETBALL"];
    const locations = [
      "Indiranagar, Bangalore",
      "Koramangala, Bangalore",
      "HSR Layout, Bangalore",
      "Whitefield, Bangalore",
      "Jayanagar, Bangalore",
    ];

    const facilities = [];
    for (let i = 0; i < 5; i++) {
      const facility = await Facility.create({
        ownerId: verifiedUser._id,
        name: `Sports Arena ${i + 1}`,
        description: `A great sports facility in ${locations[i]}`,
        location: locations[i],
        address: `${i + 1} Main Road, ${locations[i]}`,
        sports: [sports[i % sports.length], sports[(i + 1) % sports.length]],
        amenities: ["Parking", "Changing Room", "Water Fountain"],
        photos: [],
        rating: 4 + Math.random(),
        reviewCount: Math.floor(Math.random() * 100) + 10,
        approvalStatus: "APPROVED",
        isActive: true,
        bookingCount: Math.floor(Math.random() * 50),
      });
      facilities.push(facility);
    }

    // Pending and rejected facilities
    await Facility.create({
      ownerId: verifiedUser._id,
      name: "Pending Arena",
      location: "BTM Layout, Bangalore",
      sports: ["BADMINTON"],
      approvalStatus: "PENDING",
      isActive: true,
    });

    await Facility.create({
      ownerId: verifiedUser._id,
      name: "Rejected Arena",
      location: "Electronic City, Bangalore",
      sports: ["FOOTBALL"],
      approvalStatus: "REJECTED",
      isActive: true,
    });

    console.log(`Created ${facilities.length} approved facilities + 1 pending + 1 rejected`);

    // Create courts for each facility
    const courts = [];
    for (const facility of facilities) {
      const facilitySports = facility.sports;
      for (let j = 0; j < 2; j++) {
        const court = await Court.create({
          facilityId: facility._id,
          name: `Court ${j + 1}`,
          sportType: facilitySports[j % facilitySports.length],
          pricePerHour: 300 + j * 200,
          operatingHours: { open: "06:00", close: "22:00" },
          isActive: true,
        });
        courts.push(court);
      }
    }
    console.log(`Created ${courts.length} courts`);

    // Create some bookings
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    await Booking.create({
      userId: verifiedUser._id,
      facilityId: facilities[0]._id,
      courtId: courts[0]._id,
      sportType: courts[0].sportType,
      bookingDate: formatDate(tomorrow),
      startTime: "18:00",
      endTime: "19:00",
      amount: courts[0].pricePerHour,
      paymentStatus: "SUCCESS",
      bookingStatus: "CONFIRMED",
      paymentReference: "SIM-SEED001",
    });

    await Booking.create({
      userId: verifiedUser._id,
      facilityId: facilities[1]._id,
      courtId: courts[2]._id,
      sportType: courts[2].sportType,
      bookingDate: formatDate(nextWeek),
      startTime: "10:00",
      endTime: "11:00",
      amount: courts[2].pricePerHour,
      paymentStatus: "SUCCESS",
      bookingStatus: "CONFIRMED",
      paymentReference: "SIM-SEED002",
    });

    await Booking.create({
      userId: verifiedUser._id,
      facilityId: facilities[2]._id,
      courtId: courts[4]._id,
      sportType: courts[4].sportType,
      bookingDate: formatDate(today),
      startTime: "08:00",
      endTime: "09:00",
      amount: courts[4].pricePerHour,
      paymentStatus: "SUCCESS",
      bookingStatus: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: "Changed plans",
      paymentReference: "SIM-SEED003",
    });

    console.log("Created 3 seed bookings");

    console.log("Seed completed successfully!");
    console.log("\nTest credentials:");
    console.log("  Verified user: user@quickcourt.com / Password123!");
    console.log("  Unverified user: unverified@quickcourt.com / Password123!");
    console.log("  OTP (dev mode): 123456");

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

seed();
