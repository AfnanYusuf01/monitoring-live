// user-management.controller.js
import {PrismaClient} from "@prisma/client";
import bcrypt from "bcrypt";


const prisma = new PrismaClient();

// Render halaman utama
export const renderUserManagement = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const successMessage = req.query.success || null;

    res.render("pages/user/user-management", {
      navbar: "User Management",
      users: users,
      successMessage: successMessage,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data pengguna",
    });
  }
};

// Render halaman tambah user
export const renderAddUser = (req, res) => {
  res.render("pages/user/user-management-add", {
    navbar: "User Management",
  });
};

// Render halaman edit user
export const renderEditUser = async (req, res) => {
  const {id} = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: {id: parseInt(id)},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).render("pages/404", {
        navbar: "",
        message: "Pengguna tidak ditemukan",
      });
    }

    res.render("pages/user/user-management-edit", {
      navbar: "User Management",
      user: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data pengguna",
    });
  }
};

// Get all users
export async function index(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({error: "Failed to fetch users"});
  }
}

// Get single user
export async function show(req, res) {
  try {
    const {id} = req.params;
    const user = await prisma.user.findUnique({
      where: {id: parseInt(id)},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({error: "Failed to fetch user"});
  }
}

// Create new user

export async function store(req, res) {
  try {
    const {email, password, name, role} = req.body;

    // Validasi
    if (!email || !password) {
      return res.status(400).json({error: "Email and password are required"});
    }

    // Cek jika email sudah ada
    const existingUser = await prisma.user.findUnique({
      where: {email},
    });

    if (existingUser) {
      return res.status(400).json({error: "Email already exists"});
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 = salt rounds

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "user",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({error: "Failed to create user"});
  }
}

export async function update(req, res) {
  try {
    const {id} = req.params;
    const {email, name, role, password} = req.body;

    // Data yang akan diupdate
    const updateData = {email, name, role};

    // Kalau ada password baru → hash
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: {id: parseInt(id)},
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.code === "P2025") {
      return res.status(404).json({error: "User not found"});
    }
    res.status(500).json({error: "Failed to update user"});
  }
}

export async function destroy(req, res) {
  try {
    const {id} = req.params;
    const userId = parseInt(id);

    // 1️⃣ Hapus child dulu
    await prisma.akun.deleteMany({where: {userId}});
    await prisma.studio.deleteMany({where: {userId}});

    // 2️⃣ Baru hapus user
    await prisma.user.delete({
      where: {id: userId},
    });

    res.json({message: "User deleted successfully"});
  } catch (error) {
    console.error("Error deleting user:", error);

    if (error.code === "P2025") {
      return res.status(404).json({error: "User not found"});
    }
    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Foreign key constraint failed",
        message:
          "User masih punya data terkait. Hapus child record dulu atau pakai cascade.",
      });
    }

    res.status(500).json({error: "Failed to delete user"});
  }
}
