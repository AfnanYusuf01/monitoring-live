import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

// VIEW CONTROLLERS

export const renderSubscriptionManagement = async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        limitAkun: true,
        komisi: true, // Ditambahkan
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const successMessage = req.query.success || null;

    res.render("pages/subscription/subscription-management", {
      navbar: "Subscription-Management",
      subscriptions: subscriptions,
      successMessage: successMessage,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).render("pages/500", {
      navbar: "Subscription-Management",
      message: "Gagal memuat data subscription",
    });
  }
};

export const renderAddSubscription = (req, res) => {
  res.render("pages/subscription/subscription-management-add", {
    navbar: "Subscription-Management",
  });
};

export const renderEditSubscription = async (req, res) => {
  const {id} = req.params;
  try {
    const subscription = await prisma.subscription.findUnique({
      where: {id: parseInt(id)},
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        limitAkun: true,
        komisi: true, // Ditambahkan
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!subscription) {
      return res.status(404).render("pages/404", {
        navbar: "Subscription-Management",
        message: "Subscription tidak ditemukan",
      });
    }

    res.render("pages/subscription/subscription-management-edit", {
      navbar: "Subscription Management",
      subscription: subscription,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data subscription",
    });
  }
};

// API CONTROLLERS

// Get all subscriptions
export async function indexSubscription(req, res) {
  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: {createdAt: "desc"},
    });

    res.status(200).json({
      status: "success",
      message: "List of subscriptions retrieved successfully",
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch subscriptions",
      error: error.message,
    });
  }
}

// Get single subscription
export async function showSubscription(req, res) {
  try {
    const {id} = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: {id: parseInt(id)},
    });

    if (!subscription) {
      return res.status(404).json({
        status: "error",
        message: "Subscription not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Subscription retrieved successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch subscription",
      error: error.message,
    });
  }
}

// Create new subscription
export async function storeSubscription(req, res) {
  try {
    const {name, description, price, duration, limitAkun, komisi} = req.body;

    if (!name || !price || !duration) {
      return res.status(400).json({
        status: "error",
        message: "Name, price and duration are required",
      });
    }

    const subscription = await prisma.subscription.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        limitAkun: limitAkun ? parseInt(limitAkun) : 1,
        komisi: komisi !== undefined ? parseFloat(komisi) : 0, // Ditambahkan
      },
    });

    res.status(201).json({
      status: "success",
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create subscription",
      error: error.message,
    });
  }
}

// Update subscription
export async function updateSubscription(req, res) {
  try {
    const {id} = req.params;
    const {name, description, price, duration, limitAkun, komisi} = req.body;

    const subscription = await prisma.subscription.update({
      where: {id: parseInt(id)},
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        duration: duration !== undefined ? parseInt(duration) : undefined,
        limitAkun: limitAkun !== undefined ? parseInt(limitAkun) : undefined,
        komisi: komisi !== undefined ? parseFloat(komisi) : undefined, // Ditambahkan
      },
    });

    res.status(200).json({
      status: "success",
      message: "Subscription updated successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "Subscription not found",
      });
    }
    res.status(500).json({
      status: "error",
      message: "Failed to update subscription",
      error: error.message,
    });
  }
}

// Delete subscription
export async function destroySubscription(req, res) {
  try {
    const {id} = req.params;

    // Hapus semua UserSubscription terkait dulu biar FK aman
    await prisma.userSubscription.deleteMany({
      where: {subscriptionId: parseInt(id)},
    });

    await prisma.subscription.delete({
      where: {id: parseInt(id)},
    });

    res.status(200).json({
      status: "success",
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "Subscription not found",
      });
    }
    res.status(500).json({
      status: "error",
      message: "Failed to delete subscription",
      error: error.message,
    });
  }
}