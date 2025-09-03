import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

///////////////////////
///     WEB        ///
/////////////////////

// Render halaman utama performance live stream
export const renderPerformanceLiveStream = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { 
      page = 1, 
      limit = 15, 
      akunId, 
      studioId, 
      startDate, 
      endDate,
      search 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter conditions berdasarkan user yang login
    const where = {
      akun: {
        userId: userId
      }
    };
    
    // Filter by akunId (hanya akun milik user ini)
    if (akunId) {
      where.akunId = parseInt(akunId);
    }
    
    // Filter by studioId (hanya studio milik user ini)
    if (studioId) {
      where.akun.studioId = parseInt(studioId);
    }
    
    // Filter by search term (nama akun, judul live, atau nama studio)
    if (search) {
      where.OR = [
        {
          akun: {
            nama_akun: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          akun: {
            studio: {
              nama_studio: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        }
      ];
    }
    
    // Filter by date range
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    } else if (startDate) {
      where.startTime = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.startTime = {
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    const [performances, totalCount, akunList, studioList] = await Promise.all([
      // Get performance data dengan pagination
      prisma.performanceLiveStream.findMany({
        where,
        include: {
          akun: {
            select: {
              id: true,
              nama_akun: true,
              email: true,
              studioId: true,
              studio: {
                select: {
                  id: true,
                  nama_studio: true
                }
              }
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
        skip,
        take: parseInt(limit),
      }),
      
      // Get total count untuk pagination
      prisma.performanceLiveStream.count({ where }),
      
      // Get akun list untuk dropdown filter (hanya milik user ini)
      prisma.akun.findMany({
        where: {
          userId: userId,
          deletedAt: null
        },
        select: {
          id: true,
          nama_akun: true,
          studioId: true
        },
        orderBy: {
          nama_akun: "asc",
        },
      }),
      
      // Get studio list untuk dropdown filter (hanya milik user ini)
      prisma.studio.findMany({
        where: {
          userId: userId
        },
        select: {
          id: true,
          nama_studio: true
        },
        orderBy: {
          nama_studio: "asc",
        },
      })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.render("pages/performance/performance-live-stream", {
      navbar: "Performance Live Stream",
      performances,
      akunList,
      studioList,
      currentPage: parseInt(page),
      totalPages,
      totalCount,
      limit: parseInt(limit),
      filters: { 
        akunId: akunId ? parseInt(akunId) : '',
        studioId: studioId ? parseInt(studioId) : '',
        startDate: startDate || '',
        endDate: endDate || '',
        search: search || ''
      },
      successMessage: req.query.success || null,
    });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data performance live stream",
    });
  }
};


// Render halaman tambah performance
export const renderAddPerformance = async (req, res) => {
  try {
    const akunList = await prisma.akun.findMany({
      select: {
        id: true,
        nama_akun: true,
        email: true,
      },
      orderBy: {
        nama_akun: "asc",
      },
    });

    res.render("pages/performance/performance-live-stream-add", {
      navbar: "Performance Live Stream",
      akunList,
    });
  } catch (error) {
    console.error("Error fetching akun data:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data akun",
    });
  }
};

// Render halaman edit performance
export const renderEditPerformance = async (req, res) => {
  const { id } = req.params;
  try {
    const [performance, akunList] = await Promise.all([
      prisma.performanceLiveStream.findUnique({
        where: { id: parseInt(id) },
        include: {
          akun: {
            select: {
              id: true,
              nama_akun: true,
              email: true,
            },
          },
        },
      }),
      prisma.akun.findMany({
        select: {
          id: true,
          nama_akun: true,
          email: true,
        },
        orderBy: {
          nama_akun: "asc",
        },
      }),
    ]);

    if (!performance) {
      return res.status(404).render("pages/404", {
        navbar: "",
        message: "Data performance tidak ditemukan",
      });
    }

    res.render("pages/performance/performance-live-stream-edit", {
      navbar: "Performance Live Stream",
      performance,
      akunList,
    });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data performance",
    });
  }
};

///////////////////////
///     API        ///
/////////////////////

// Get all performance live streams
export async function indexPerformance(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      akunId,
      startDate,
      endDate,
      search,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter conditions
    const where = {};

    if (akunId) {
      where.akunId = parseInt(akunId);
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        {
          akun: {
            nama_akun: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [performances, totalCount] = await Promise.all([
      prisma.performanceLiveStream.findMany({
        where,
        include: {
          akun: {
            select: {
              id: true,
              nama_akun: true,
              email: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.performanceLiveStream.count({ where }),
    ]);

    res.json({
      data: performances,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
}

// Get single performance live stream
export async function showPerformance(req, res) {
  try {
    const { id } = req.params;
    const performance = await prisma.performanceLiveStream.findUnique({
      where: { id: parseInt(id) },
      include: {
        akun: {
          select: {
            id: true,
            nama_akun: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!performance) {
      return res.status(404).json({ error: "Performance data not found" });
    }

    res.json(performance);
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
}

// Create new performance live stream
export async function storePerformance(req, res) {
  try {
    const {
      title,
      startTime,
      durationMs,
      statusCode,
      conversionRate,
      totalViews,
      totalLikes,
      followersGrowth,
      productClicks,
      uniqueViewers,
      peakViewers,
      avgViewDuration,
      totalComments,
      addToCart,
      placedOrders,
      placedSalesAmount,
      confirmedOrders,
      confirmedSalesAmount,
      akunId,
    } = req.body;

    // Validasi required fields
    if (!title || !startTime || !akunId) {
      return res.status(400).json({
        error: "Title, startTime, and akunId are required",
      });
    }

    // Cek jika akun exists
    const akun = await prisma.akun.findUnique({
      where: { id: parseInt(akunId) },
    });

    if (!akun) {
      return res.status(400).json({ error: "Akun not found" });
    }

    const performance = await prisma.performanceLiveStream.create({
      data: {
        title,
        startTime: new Date(startTime),
        durationMs: parseInt(durationMs) || 0,
        statusCode: parseInt(statusCode) || 200,
        conversionRate: parseFloat(conversionRate) || 0,
        totalViews: parseInt(totalViews) || 0,
        totalLikes: parseInt(totalLikes) || 0,
        followersGrowth: parseInt(followersGrowth) || 0,
        productClicks: parseInt(productClicks) || 0,
        uniqueViewers: parseInt(uniqueViewers) || 0,
        peakViewers: parseInt(peakViewers) || 0,
        avgViewDuration: parseFloat(avgViewDuration) || 0,
        totalComments: parseInt(totalComments) || 0,
        addToCart: parseInt(addToCart) || 0,
        placedOrders: parseInt(placedOrders) || 0,
        placedSalesAmount: parseFloat(placedSalesAmount) || 0,
        confirmedOrders: parseInt(confirmedOrders) || 0,
        confirmedSalesAmount: parseFloat(confirmedSalesAmount) || 0,
        akunId: parseInt(akunId),
      },
      include: {
        akun: {
          select: {
            id: true,
            nama_akun: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(performance);
  } catch (error) {
    console.error("Error creating performance data:", error);
    
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Invalid akunId" });
    }
    
    res.status(500).json({ error: "Failed to create performance data" });
  }
}

// Update performance live stream
export async function updatePerformance(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      startTime,
      durationMs,
      statusCode,
      conversionRate,
      totalViews,
      totalLikes,
      followersGrowth,
      productClicks,
      uniqueViewers,
      peakViewers,
      avgViewDuration,
      totalComments,
      addToCart,
      placedOrders,
      placedSalesAmount,
      confirmedOrders,
      confirmedSalesAmount,
      akunId,
    } = req.body;

    // Cek jika performance data exists
    const existingPerformance = await prisma.performanceLiveStream.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPerformance) {
      return res.status(404).json({ error: "Performance data not found" });
    }

    // Jika ada akunId, validasi akun exists
    if (akunId) {
      const akun = await prisma.akun.findUnique({
        where: { id: parseInt(akunId) },
      });

      if (!akun) {
        return res.status(400).json({ error: "Akun not found" });
      }
    }

    const updateData = {
      title,
      startTime: startTime ? new Date(startTime) : undefined,
      durationMs: durationMs !== undefined ? parseInt(durationMs) : undefined,
      statusCode: statusCode !== undefined ? parseInt(statusCode) : undefined,
      conversionRate: conversionRate !== undefined ? parseFloat(conversionRate) : undefined,
      totalViews: totalViews !== undefined ? parseInt(totalViews) : undefined,
      totalLikes: totalLikes !== undefined ? parseInt(totalLikes) : undefined,
      followersGrowth: followersGrowth !== undefined ? parseInt(followersGrowth) : undefined,
      productClicks: productClicks !== undefined ? parseInt(productClicks) : undefined,
      uniqueViewers: uniqueViewers !== undefined ? parseInt(uniqueViewers) : undefined,
      peakViewers: peakViewers !== undefined ? parseInt(peakViewers) : undefined,
      avgViewDuration: avgViewDuration !== undefined ? parseFloat(avgViewDuration) : undefined,
      totalComments: totalComments !== undefined ? parseInt(totalComments) : undefined,
      addToCart: addToCart !== undefined ? parseInt(addToCart) : undefined,
      placedOrders: placedOrders !== undefined ? parseInt(placedOrders) : undefined,
      placedSalesAmount: placedSalesAmount !== undefined ? parseFloat(placedSalesAmount) : undefined,
      confirmedOrders: confirmedOrders !== undefined ? parseInt(confirmedOrders) : undefined,
      confirmedSalesAmount: confirmedSalesAmount !== undefined ? parseFloat(confirmedSalesAmount) : undefined,
      akunId: akunId !== undefined ? parseInt(akunId) : undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const performance = await prisma.performanceLiveStream.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        akun: {
          select: {
            id: true,
            nama_akun: true,
            email: true,
          },
        },
      },
    });

    res.json(performance);
  } catch (error) {
    console.error("Error updating performance data:", error);
    
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Performance data not found" });
    }
    
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Invalid akunId" });
    }
    
    res.status(500).json({ error: "Failed to update performance data" });
  }
}

// Delete performance live stream
export async function destroyPerformance(req, res) {
  try {
    const { id } = req.params;

    // Cek jika performance data exists
    const performance = await prisma.performanceLiveStream.findUnique({
      where: { id: parseInt(id) },
    });

    if (!performance) {
      return res.status(404).json({ error: "Performance data not found" });
    }

    await prisma.performanceLiveStream.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Performance data deleted successfully" });
  } catch (error) {
    console.error("Error deleting performance data:", error);
    
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Performance data not found" });
    }
    
    res.status(500).json({ error: "Failed to delete performance data" });
  }
}