import {PrismaClient} from "@prisma/client";
const prisma = new PrismaClient();

/* =========================
   WEB RENDERING CONTROLLER
========================= */

// List User Subscriptions
export const renderUserSubscriptionManagement = async (req, res) => {
  try {
    const userSubscriptions = await prisma.userSubscription.findMany({
      select: {
        id: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        status: true,
        user: {select: {id: true, email: true, name: true}},
        subscription: {
          select: {id: true, name: true, price: true, duration: true},
        },
      },
      orderBy: {createdAt: "desc"},
    });

    const successMessage = req.query.success || null;

    res.render("pages/user-subscription/user-subscription-management", {
      navbar: "User Subscription Management",
      userSubscriptions,
      successMessage,
    });
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data user subscription",
    });
  }
};

// Render Add Form
export const renderAddUserSubscription = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {id: true, email: true, name: true},
    });
    const subscriptions = await prisma.subscription.findMany({
      select: {id: true, name: true, price: true, duration: true},
    });

    res.render("pages/user-subscription/user-subscription-management-add", {
      navbar: "User Subscription Management",
      users,
      subscriptions,
    });
  } catch (error) {
    console.error("Error fetching add form:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat form tambah user subscription",
    });
  }
};

// Render Edit Form
export const renderEditUserSubscription = async (req, res) => {
  const {id} = req.params;
  try {
    const userSubscription = await prisma.userSubscription.findUnique({
      where: {id: parseInt(id)},
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        userId: true,
        subscriptionId: true,
      },
    });

    if (!userSubscription) {
      return res.status(404).render("pages/404", {
        navbar: "",
        message: "User subscription tidak ditemukan",
      });
    }

    const users = await prisma.user.findMany({
      select: {id: true, email: true, name: true},
    });
    const subscriptions = await prisma.subscription.findMany({
      select: {id: true, name: true, price: true, duration: true},
    });

    res.render("pages/user-subscription/user-subscription-management-edit", {
      navbar: "User Subscription Management",
      userSubscription,
      users,
      subscriptions,
    });
  } catch (error) {
    console.error("Error fetching edit form:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data user subscription",
    });
  }
};

/* =========================
   API CONTROLLER
========================= */

// Get all
export const indexUserSubscription = async (req, res) => {
  try {
    const userSubscriptions = await prisma.userSubscription.findMany({
      include: {
        user: {select: {id: true, name: true, email: true}},
        subscription: {select: {id: true, name: true, price: true}},
      },
      orderBy: {createdAt: "desc"},
    });

    res.json({
      status: "success",
      message: "List berhasil diambil",
      data: userSubscriptions,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "Gagal fetch data",
        error: error.message,
      });
  }
};

// Get single
export const showUserSubscription = async (req, res) => {
  try {
    const {id} = req.params;
    const userSubscription = await prisma.userSubscription.findUnique({
      where: {id: parseInt(id)},
      include: {
        user: {select: {id: true, name: true, email: true}},
        subscription: {select: {id: true, name: true, price: true}},
      },
    });

    if (!userSubscription)
      return res
        .status(404)
        .json({status: "error", message: "Data tidak ditemukan"});

    res.json({
      status: "success",
      message: "Data berhasil diambil",
      data: userSubscription,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "Gagal fetch data",
        error: error.message,
      });
  }
};

// Store
export const storeUserSubscription = async (req, res) => {
  try {
    const {userId, subscriptionId, startDate, endDate, status} = req.body;
    if (!userId || !subscriptionId)
      return res
        .status(400)
        .json({status: "error", message: "userId dan subscriptionId wajib"});

    const userSubscription = await prisma.userSubscription.create({
      data: {
        userId: parseInt(userId),
        subscriptionId: parseInt(subscriptionId),
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status: status || "active",
      },
    });

    res
      .status(201)
      .json({
        status: "success",
        message: "Data berhasil dibuat",
        data: userSubscription,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "Gagal create data",
        error: error.message,
      });
  }
};

// Update
export const updateUserSubscription = async (req, res) => {
  try {
    const {id} = req.params;
    const {startDate, endDate, status} = req.body;

    const userSubscription = await prisma.userSubscription.update({
      where: {id: parseInt(id)},
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status: status || undefined,
      },
    });

    res.json({
      status: "success",
      message: "Data berhasil diupdate",
      data: userSubscription,
    });
  } catch (error) {
    if (error.code === "P2025")
      return res
        .status(404)
        .json({status: "error", message: "Data tidak ditemukan"});
    res
      .status(500)
      .json({
        status: "error",
        message: "Gagal update data",
        error: error.message,
      });
  }
};

// Destroy
export const destroyUserSubscription = async (req, res) => {
  try {
    const {id} = req.params;
    const userSubscriptionId = parseInt(id);

    // Hapus semua order terkait
    await prisma.order.deleteMany({
      where: {userSubscriptionId},
    });

    // Hapus user subscription
    await prisma.userSubscription.delete({
      where: {id: userSubscriptionId},
    });

    res.json({
      status: "success",
      message: "User subscription dan order terkait berhasil dihapus",
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "Data tidak ditemukan",
      });
    }
    res.status(500).json({
      status: "error",
      message: "Gagal menghapus data",
      error: error.message,
    });
  }
};
