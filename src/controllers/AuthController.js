import {PrismaClient} from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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

      // Generate access token 8 digit random
      const generateAccessToken = () => {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
      };
      
      let accessToken;
      let isTokenUnique = false;
      
      // Pastikan token unik
      while (!isTokenUnique) {
        accessToken = generateAccessToken();
        const existingToken = await prisma.user.findUnique({
          where: { access_token: accessToken },
        });
        
        if (!existingToken) {
          isTokenUnique = true;
        }
      }

      // Buat user baru dengan access token
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          nomor_wa,
          role: "user",
          access_token: accessToken, // Menambahkan access token
        },
      });

      // Kirim email konfirmasi pendaftaran
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: newUser.email,
          subject: "Selamat Datang di Streamo - Registrasi Berhasil",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #007bff; padding: 20px; text-align: center; color: white;">
              <h1>Selamat Datang di Streamo!</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd;">
              <p>Halo <strong>${newUser.name}</strong>,</p>
              <p>Selamat! Akun Streamo Anda telah berhasil dibuat.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Detail akun Anda:</strong></p>
                <p style="margin: 5px 0;">Nama: ${newUser.name}</p>
                <p style="margin: 5px 0;">Email: ${newUser.email}</p>
                <p style="margin: 5px 0;">Nomor WhatsApp: ${newUser.nomor_wa}</p>
                <p style="margin: 5px 0;"><strong>Access Token: ${accessToken}</strong></p>
              </div>
              
              <p>Access Token ini dapat digunakan untuk mengakses API atau fitur khusus lainnya.</p>
              <p>Anda sekarang dapat login menggunakan email dan password yang telah Anda buat.</p>
              <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi tim dukungan kami.</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.APP_URL || "http://localhost:3000"}/login" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Login ke Akun Saya
                </a>
              </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #6c757d; font-size: 14px;">
              <p>Terima kasih telah bergabung dengan Streamo</p>
              <p>© ${new Date().getFullYear()} Streamo. All rights reserved.</p>
            </div>
          </div>
        `,
        });
      } catch (mailErr) {
        console.error("❌ Gagal kirim email konfirmasi:", mailErr.message);
        // Tetap lanjutkan proses registrasi meskipun email gagal dikirim
      }

      // Auto login setelah registrasi
      req.session.user = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        nomor_wa: newUser.nomor_wa,
        access_token: newUser.access_token, // Menambahkan access token ke session
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
      where: { id: req.session.user.id },
    });
    console.log("data user", user);

    res.render("pages/profile", {
      navbar: "Profile",
      currentUser: user, // Mengubah dari 'user' menjadi 'currentUser'
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

      // Generate access token 8 digit random
      const generateAccessToken = () => {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
      };
      
      let accessToken;
      let isTokenUnique = false;
      
      // Pastikan token unik
      while (!isTokenUnique) {
        accessToken = generateAccessToken();
        const existingToken = await prisma.user.findUnique({
          where: { access_token: accessToken },
        });
        
        if (!existingToken) {
          isTokenUnique = true;
        }
      }

      // Buat user baru dengan access token
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          nomor_wa,
          role: "user",
          access_token: accessToken, // Menambahkan access token
        },
      });

      // Kirim email konfirmasi pendaftaran
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: newUser.email,
          subject: "Selamat Datang di Streamo - Registrasi Berhasil",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #007bff; padding: 20px; text-align: center; color: white;">
              <h1>Selamat Datang di Streamo!</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd;">
              <p>Halo <strong>${newUser.name}</strong>,</p>
              <p>Selamat! Akun Streamo Anda telah berhasil dibuat.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Detail akun Anda:</strong></p>
                <p style="margin: 5px 0;">Nama: ${newUser.name}</p>
                <p style="margin: 5px 0;">Email: ${newUser.email}</p>
                <p style="margin: 5px 0;">Nomor WhatsApp: ${newUser.nomor_wa}</p>
                <p style="margin: 5px 0;"><strong>Access Token: ${accessToken}</strong></p>
              </div>
              
              <p>Access Token ini dapat digunakan untuk mengakses API atau fitur khusus lainnya.</p>
              <p>Simpan token ini dengan aman dan jangan bagikan kepada siapapun.</p>
              <p>Anda sekarang dapat login menggunakan email dan password yang telah Anda buat.</p>
              <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi tim dukungan kami.</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.APP_URL || "http://localhost:3000"}/login" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Login ke Akun Saya
                </a>
              </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #6c757d; font-size: 14px;">
              <p>Terima kasih telah bergabung dengan Streamo</p>
              <p>© ${new Date().getFullYear()} Streamo. All rights reserved.</p>
            </div>
          </div>
        `,
        });
      } catch (mailErr) {
        console.error("❌ Gagal kirim email konfirmasi:", mailErr.message);
        // Tetap lanjutkan proses registrasi meskipun email gagal dikirim
      }

      // Simpan session (opsional)
      req.session.user = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        nomor_wa: newUser.nomor_wa,
        role: newUser.role,
        access_token: newUser.access_token, // Menambahkan access token ke session
      };

      // Response sukses
      return res.status(201).json({
        success: true,
        message: "Registrasi berhasil. Email konfirmasi telah dikirim.",
        data: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          nomor_wa: newUser.nomor_wa,
          role: newUser.role,
          access_token: newUser.access_token, // Menambahkan access token dalam response
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

  // render forget password page
  forgetPasswordPage: (req, res) => {
    res.render("pages/forget-password", {
      navbar: "Forget Password",
      error: null,
      success: null,
    });
  },

  // handle forget password request
  forgetPassword: async (req, res) => {
    const {email} = req.body;

    try {
      // cari user by email
      const user = await prisma.user.findUnique({
        where: {email},
      });

      if (!user) {
        // Untuk keamanan, jangan beri tahu bahwa email tidak ditemukan
        return res.render("pages/forget-password", {
          navbar: "Forget Password",
          success: "Jika email terdaftar, link reset password akan dikirim",
          error: null,
        });
      }

      // Generate reset token dengan JWT
      const resetToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          // Tambahkan random string untuk memastikan token unik
          random: crypto.randomBytes(20).toString("hex"),
        },
        process.env.JWT_SECRET || "your-secret-key",
        {expiresIn: "1h"} // Token berlaku 1 jam
      );

      // Buat reset URL
      const resetUrl = `${
        process.env.APP_URL || "http://localhost:3000"
      }/reset-password/${resetToken}`;

      // Kirim email
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: "Reset Password - Streamo",
          html: `
            <p>Halo ${user.name || "User"},</p>
            <p>Anda menerima email ini karena meminta reset password untuk akun Streamo Anda.</p>
            <p>Silakan klik link di bawah ini untuk reset password:</p>
            <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
            <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
            <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
            <br>
            <p>Hormat kami,<br>Tim Streamo</p>
          `,
        });
      } catch (mailErr) {
        console.error("❌ Gagal kirim email:", mailErr.message);
        return res.render("pages/forget-password", {
          navbar: "Forget Password",
          error: "Gagal mengirim email reset password",
          success: null,
        });
      }

      return res.render("pages/forget-password", {
        navbar: "Forget Password",
        success: "Jika email terdaftar, link reset password akan dikirim",
        error: null,
      });
    } catch (err) {
      console.error(err);
      return res.render("pages/forget-password", {
        navbar: "Forget Password",
        error: "Terjadi kesalahan server",
        success: null,
      });
    }
  },

  // render reset password page
  resetPasswordPage: (req, res) => {
    const {token} = req.params;

    res.render("pages/reset-password", {
      navbar: "Reset Password",
      token,
      error: null,
      success: null,
    });
  },

  // handle reset password form
  resetPassword: async (req, res) => {
    const {token, password, confirmPassword} = req.body;

    try {
      // Validasi password
      if (password !== confirmPassword) {
        return res.render("pages/reset-password", {
          navbar: "Reset Password",
          token,
          error: "Password dan konfirmasi password tidak cocok",
          success: null,
        });
      }

      // Verifikasi token
      let decoded;
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );
      } catch (jwtErr) {
        return res.render("pages/reset-password", {
          navbar: "Reset Password",
          token,
          error: "Token reset password tidak valid atau sudah kedaluwarsa",
          success: null,
        });
      }

      // Cari user berdasarkan ID dari token
      const user = await prisma.user.findUnique({
        where: {id: decoded.userId},
      });

      if (!user) {
        return res.render("pages/reset-password", {
          navbar: "Reset Password",
          token,
          error: "User tidak ditemukan",
          success: null,
        });
      }

      // Hash password baru
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password user
      await prisma.user.update({
        where: {id: user.id},
        data: {password: hashedPassword},
      });

      return res.render("pages/reset-password", {
        navbar: "Reset Password",
        token: null,
        error: null,
        success:
          "Password berhasil direset. Silakan login dengan password baru Anda.",
      });
    } catch (err) {
      console.error(err);
      return res.render("pages/reset-password", {
        navbar: "Reset Password",
        token,
        error: "Terjadi kesalahan server",
        success: null,
      });
    }
  },
};
