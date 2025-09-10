import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

///////////////////////
///     WEB    ///////
/////////////////////

// Render halaman utama
export const renderPriceManagement = async (req, res) => {
  try {
    const prices = await prisma.price.findMany({
      orderBy: {
        id: "asc",
      },
    });

    const successMessage = req.query.success || null;

    res.render("pages/price/price-management", {
      navbar: "Price Management",
      prices: prices,
      successMessage: successMessage,
    });
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data harga",
    });
  }
};

// Render halaman tambah price
export const renderAddPrice = (req, res) => {
  res.render("pages/price/price-management-add", {
    navbar: "Price Management",
  });
};

// Render halaman edit price
export const renderEditPrice = async (req, res) => {
  const {id} = req.params;
  try {
    const price = await prisma.price.findUnique({
      where: {id: parseInt(id)},
    });

    if (!price) {
      return res.status(404).render("pages/404", {
        navbar: "",
        message: "Data harga tidak ditemukan",
      });
    }

    res.render("pages/price/price-management-edit", {
      navbar: "Price Management",
      price: price,
    });
  } catch (error) {
    console.error("Error fetching price:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data harga",
    });
  }
};

///////////////////////
///     API    ///////
/////////////////////

// Get all prices
export async function indexPrice(req, res) {
  try {
    const prices = await prisma.price.findMany({
      orderBy: {
        id: "asc",
      },
    });
    res.json(prices);
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).json({error: "Failed to fetch prices"});
  }
}

// Get single price
export async function showPrice(req, res) {
  try {
    const {id} = req.params;
    const price = await prisma.price.findUnique({
      where: {id: parseInt(id)},
    });

    if (!price) {
      return res.status(404).json({error: "Price not found"});
    }

    res.json(price);
  } catch (error) {
    console.error("Error fetching price:", error);
    res.status(500).json({error: "Failed to fetch price"});
  }
}

// Create new price
export async function storePrice(req, res) {
  try {
    const {skema, formAkun, toAkun, priceAkun, priceMount} = req.body;

    // Validasi
    if (!skema || !formAkun || !toAkun || !priceAkun || !priceMount) {
      return res.status(400).json({error: "Semua field harus diisi"});
    }

    const price = await prisma.price.create({
      data: {
        skema,
        formAkun: parseInt(formAkun),
        toAkun: parseInt(toAkun),
        priceAkun: parseInt(priceAkun),
        priceMount: parseInt(priceMount),
      },
    });

    res.json(price);
  } catch (error) {
    console.error("Error creating price:", error);
    res.status(500).json({error: "Failed to create price"});
  }
}

// Update price
export async function updatePrice(req, res) {
  try {
    const {id} = req.params;
    const {skema, formAkun, toAkun, priceAkun, priceMount} = req.body;

    const price = await prisma.price.update({
      where: {id: parseInt(id)},
      data: {
        skema,
        formAkun: parseInt(formAkun),
        toAkun: parseInt(toAkun),
        priceAkun: parseInt(priceAkun),
        priceMount: parseInt(priceMount),
      },
    });

    res.json(price);
  } catch (error) {
    console.error("Error updating price:", error);
    if (error.code === "P2025") {
      return res.status(404).json({error: "Price not found"});
    }
    res.status(500).json({error: "Failed to update price"});
  }
}

// Delete price
export async function destroyPrice(req, res) {
  try {
    const {id} = req.params;
    const priceId = parseInt(id);

    await prisma.price.delete({
      where: {id: priceId},
    });

    res.json({message: "Price deleted successfully"});
  } catch (error) {
    console.error("Error deleting price:", error);
    if (error.code === "P2025") {
      return res.status(404).json({error: "Price not found"});
    }
    res.status(500).json({
      error: "Failed to delete price",
      message: error.message,
    });
  }
}
