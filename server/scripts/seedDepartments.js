
import mongoose from "mongoose";
import connectToDatabase from "../db/db.js";
import Department from "../models/Department.js";

const departments = [
  {
    departmentName: "Engineering",
    description: "Software development and engineering",
  },
  {
    departmentName: "Human Resources",
    description: "Recruitment and employee management",
  },
  {
    departmentName: "Finance",
    description: "Accounting and financial planning",
  },
  {
    departmentName: "Marketing",
    description: "Branding and marketing campaigns",
  },
  {
    departmentName: "Sales",
    description: "Client acquisition and revenue growth",
  },
  {
    departmentName: "Operations",
    description: "Business operations and process management",
  },
];

const seedDepartments = async () => {
  try {
    await connectToDatabase();

    for (const department of departments) {
      const existing = await Department.findOne({
        departmentName: {
          $regex: `^${department.departmentName}$`,
          $options: "i",
        },
      });

      if (existing) {
        console.log(`Already exists: ${existing.departmentName}`);
        continue;
      }

      const created = await Department.create(department);

      console.log(`Created: ${created.departmentName}`);
    }

    console.log("\nDepartment seeding completed.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDepartments();
