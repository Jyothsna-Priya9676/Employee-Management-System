
import mongoose from "mongoose";
import Department from "../models/Department.js";
import Employee from "../models/Employee.js";

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.aggregate([
      {
        $lookup: {
          from: Employee.collection.name,
          localField: "_id",
          foreignField: "department",
          as: "employees",
        },
      },
      {
        $project: {
          departmentName: 1,
          description: 1,
          createdAt: 1,
          updatedAt: 1,
          employeeCount: { $size: "$employees" },
        },
      },
      { $sort: { departmentName: 1 } },
    ]);

    return res.json({ success: true, departments });
  } catch (error) {
    console.error("getDepartments:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load departments",
    });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const departmentName =
      typeof req.body.departmentName === "string"
        ? req.body.departmentName.trim()
        : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        error: "Department name is required",
      });
    }

    if (departmentName.length > 100 || description.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Department name or description is too long",
      });
    }

    const duplicate = await Department.findOne({
      departmentName: {
        $regex: `^${escapeRegex(departmentName)}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: "A department with this name already exists",
      });
    }

    const department = await Department.create({
      departmentName,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department: { ...department.toObject(), employeeCount: 0 },
    });
  } catch (error) {
    console.error("createDepartment:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "A department with this name already exists",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to create department",
    });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid department ID",
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        error: "Department not found",
      });
    }

    if (req.body.departmentName !== undefined) {
      if (typeof req.body.departmentName !== "string") {
        return res.status(400).json({
          success: false,
          error: "Department name must be text",
        });
      }

      const departmentName = req.body.departmentName.trim();

      if (!departmentName || departmentName.length > 100) {
        return res.status(400).json({
          success: false,
          error: "Department name must contain 1–100 characters",
        });
      }

      const duplicate = await Department.findOne({
        _id: { $ne: id },
        departmentName: {
          $regex: `^${escapeRegex(departmentName)}$`,
          $options: "i",
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: "A department with this name already exists",
        });
      }

      department.departmentName = departmentName;
    }

    if (req.body.description !== undefined) {
      if (
        typeof req.body.description !== "string" ||
        req.body.description.length > 500
      ) {
        return res.status(400).json({
          success: false,
          error: "Description must be text with at most 500 characters",
        });
      }

      department.description = req.body.description.trim();
    }

    await department.save();

    const employeeCount = await Employee.countDocuments({
      department: department._id,
    });

    return res.json({
      success: true,
      message: "Department updated successfully",
      department: { ...department.toObject(), employeeCount },
    });
  } catch (error) {
    console.error("updateDepartment:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "A department with this name already exists",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to update department",
    });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid department ID",
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        error: "Department not found",
      });
    }

    const employeeCount = await Employee.countDocuments({
      department: department._id,
    });

    if (employeeCount > 0) {
      return res.status(409).json({
        success: false,
        error: "Move or remove this department's employees before deleting it",
      });
    }

    await department.deleteOne();

    return res.json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("deleteDepartment:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete department",
    });
  }
};
