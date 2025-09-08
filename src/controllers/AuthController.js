import {PrismaClient} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export default {
  // render login page
  index: (req, res) => {
    res.render("pages/sign-in"); // views/pages/sign-in.ejs
  },

  // handle login form
  login: async (req, res) => {
    const {email, password} = req.body;

    try {
      // cari user by email
      const user = await prisma.user.findUnique({
        where: {email},
      });

      if (!user) {
        return res.render("pages/sign-in", {
          error: "Email tidak ditemukan",
        });
      }

      // cek password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render("pages/sign-in", {
          error: "Password salah",
        });
      }

      // simpan session
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        nomor_wa: user.nomor_wa,
      };

      return res.redirect("/dashboard"); // arahkan ke dashboard
    } catch (err) {
      console.error(err);
      return res.render("pages/sign-in", {
        error: "Terjadi kesalahan server",
      });
    }
  },

  register: async (req, res) => {
    const {name, email, password, nomor_wa, terms} = req.body;

    try {
      // Validasi input
      if (!name || !email || !password || !nomor_wa) {
        return res.render("pages/sign-up", {
          navbar: "Sign Up",
          error: "Semua field harus diisi",
          success: null,
          formData: {name, email, nomor_wa},
        });
      }


      // Cek apakah email sudah terdaftar
      const existingUser = await prisma.user.findUnique({
        where: {email},
      });

      if (existingUser) {
        return res.render("pages/sign-up", {
          navbar: "Sign Up",
          error: "Email sudah terdaftar",
          success: null,
          formData: {name, email, nomor_wa},
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Buat user baru
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          nomor_wa, // Simpan nomor WA
          role: "user",
        },
      });

      // Auto login setelah registrasi
      req.session.user = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        nomor_wa: newUser.nomor_wa,
      };

      // Redirect ke halaman utama setelah registrasi berhasil
      return res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      return res.render("pages/sign-up", {
        navbar: "Sign Up",
        error: "Terjadi kesalahan server",
        success: null,
        formData: {name, email, nomor_wa},
      });
    }
  },

  // logout
  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  },

  // render profile page
  profile: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: {id: req.session.user.id},
      });

      res.render("pages/profile", {
        navbar: "Profile",
        user: user,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } catch (err) {
      console.error(err);
      res.render("pages/profile", {
        navbar: "Profile",
        error: "Terjadi kesalahan server",
      });
    }
  },

  // update profile
  updateProfile: async (req, res) => {
    const {name, email, current_password, new_password} = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: {id: req.session.user.id},
      });

      // Validasi password saat ini jika ingin mengubah password
      if (new_password) {
        if (!current_password) {
          req.flash(
            "error",
            "Password saat ini harus diisi untuk mengubah password"
          );
          return res.redirect("/profile");
        }

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
          req.flash("error", "Password saat ini salah");
          return res.redirect("/profile");
        }
      }

      // Data yang akan diupdate
      const updateData = {
        name: name,
        email: email,
      };

      // Jika ada password baru, hash password baru
      if (new_password) {
        updateData.password = await bcrypt.hash(new_password, 10);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: {id: req.session.user.id},
        data: updateData,
      });

      // Update session
      req.session.user = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      };

      req.flash("success", "Profil berhasil diperbarui");
      res.redirect("/profile");
    } catch (err) {
      console.error(err);

      // Handle error duplikat email
      if (err.code === "P2002") {
        req.flash("error", "Email sudah digunakan");
      } else {
        req.flash("error", "Terjadi kesalahan server");
      }

      res.redirect("/profile");
    }
  },

  loginApi: async (req, res) => {
    const {email, password} = req.body;

    try {
      // Cari user berdasarkan email
      const user = await prisma.user.findUnique({where: {email}});
      if (!user) {
        return res
          .status(404)
          .json({success: false, message: "Email tidak ditemukan"});
      }

      // Cek password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({success: false, message: "Password salah"});
      }

      // Simpan session (opsional, jika ingin tetap pakai session)
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        nomor_wa: user.nomor_wa,
        role: user.role,
      };

      // Response sukses
      return res.json({
        success: true,
        message: "Login berhasil",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          nomor_wa: user.nomor_wa,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({success: false, message: "Terjadi kesalahan server"});
    }
  },

  registerApi: async (req, res) => {
    const {name, email, password, nomor_wa, terms} = req.body;

    try {
      // Validasi input
      if (!name || !email || !password || !nomor_wa) {
        return res
          .status(400)
          .json({success: false, message: "Semua field harus diisi"});
      }

      // if (!terms) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Anda harus menyetujui syarat dan ketentuan",
      //   });
      // }

      // Cek email sudah terdaftar
      const existingUser = await prisma.user.findUnique({where: {email}});
      if (existingUser) {
        return res
          .status(409)
          .json({success: false, message: "Email sudah terdaftar"});
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Buat user baru
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          nomor_wa,
          role: "user",
        },
      });

      // Simpan session (opsional)
      req.session.user = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        nomor_wa: newUser.nomor_wa,
        role: newUser.role,
      };

      // Response sukses
      return res.status(201).json({
        success: true,
        message: "Registrasi berhasil",
        data: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          nomor_wa: newUser.nomor_wa,
          role: newUser.role,
        },
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({success: false, message: "Terjadi kesalahan server"});
    }
  },
  logoutApi: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ Error saat logout:", err);
        return res.status(500).json({
          success: false,
          message: "Terjadi kesalahan saat logout",
        });
      }

      // Optional: hapus cookie session di client
      res.clearCookie("connect.sid"); // nama cookie default express-session

      return res.json({
        success: true,
        message: "Logout berhasil",
      });
    });
  },
};
