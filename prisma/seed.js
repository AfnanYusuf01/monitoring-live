import {PrismaClient} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // hash password helper
  const hashPassword = (plain) => bcrypt.hashSync(plain, 10);

  // ===== User =====
  await prisma.user.createMany({
    data: [
      {
        email: "admin@example.com",
        password: hashPassword("admin123"),
        name: "Administrator",
        role: "superadmin",
      },
      {
        email: "user1@example.com",
        password: hashPassword("user123"),
        name: "Afnan Yusuf",
        role: "user",
      },
      {
        email: "user2@example.com",
        password: hashPassword("user456"),
        name: "Budi Santoso",
        role: "user",
      },
    ],
    skipDuplicates: true, // biar ga error kalau sudah ada
  });

  // ===== Studio =====
  await prisma.studio.createMany({
    data: [
      {nama_studio: "Studio 1"},
      {nama_studio: "Studio 2"},
      {nama_studio: "Studio 3"},
    ],
    skipDuplicates: true,
  });

  // Ambil kembali data studio untuk relasi
  const studio1 = await prisma.studio.findFirst({
    where: {nama_studio: "Studio 1"},
  });
  const studio2 = await prisma.studio.findFirst({
    where: {nama_studio: "Studio 2"},
  });
  const studio3 = await prisma.studio.findFirst({
    where: {nama_studio: "Studio 3"},
  });

  // ===== Akun =====
  await prisma.akun.createMany({
    data: [
      {
        nama_akun: "Bukan Kw",
        cookie:
          "_gcl_au=1.1.705097677.1754156285; _fbp=fb.2.1754156284808.721388348546426587; SPC_F=LPE8Iea45gqjEos0ACS6kq6EAQ8xnE1I; REC_T_ID=7704ecbb-6fc7-11f0-9655-d6dfde45f6b6; SPC_CLIENTID=TFBFOEllYTQ1Z3Fqzoexglpmrfighfll; LIVE_STREAMING_UUID_KEY=9LSfUHao2fAWxD622B4hHnxsHEzH4AGy; REC7iLP4Q=a6c94e8d-6374-4c37-a762-447c5a700648; SPC_U=1581821999; SPC_R_T_ID=71+SwfMcQRXSLacV8IM720RI26PvyrLY3yMGBnkl7Ve74XhgHZm6kU9v1XbUfSYGstLtdgXbmGjT+AKkFpPrHxg4nPwf0TrLoTJSxiO2yVAhrmjFyND/oKztZLm/odditfkqZFwhwH9fHZ//G1qcm26tE9pXxAzDyPqc1DonY8I=; SPC_R_T_IV=eDRLcnBBd2NpT2dIQUNjbw==; SPC_T_ID=71+SwfMcQRXSLacV8IM720RI26PvyrLY3yMGBnkl7Ve74XhgHZm6kU9v1XbUfSYGstLtdgXbmGjT+AKkFpPrHxg4nPwf0TrLoTJSxiO2yVAhrmjFyND/oKztZLm/odditfkqZFwhwH9fHZ//G1qcm26tE9pXxAzDyPqc1DonY8I=; SPC_T_IV=eDRLcnBBd2NpT2dIQUNjbw==; SPC_ST=.T0tHVHRXdGM3b3RjenNwU3vFQt0Ui3q9LRs24E0yegy/BjX+w7oWnbEd3bUuRaRmsJBsJvDZKLVqZ7DlHoXBjb4MZpkOhbtPvGGVN6QJs329KuY6yQzDzDekSnI0SGA354RLwmEuX5h7Dves0GWGuzbnNg09+7rL4EPVcZ+3XR56Nboe4Ovg9oLQmQYZWJqsf2YbbjfTRKolCyWoasgsWd0FotQXcimSPRerZ1sIVEEijsRr9ICglvb+BG4h70eA; _QPWSDCXHZQA=adf79ffa-bf03-43b7-a144-0adef6ccfe3b; SPC_SI=cnScaAAAAAAyR0FSY3g1ei4bBgEAAAAAdktyYTJMaUc=; _sapid=a327407a3c01df12cf6a5f556e50344c83ea04d50eacb71a296344b9; _gid=GA1.3.2025910173.1755791486; csrftoken=VvEdI122jlP3ZVUJdhmsBGReh9eJ0Jes; SPC_CDS_CHAT=20989835-11cd-4121-a942-03c7f6e85221; language=id; SPC_SEC_SI=v1-ZTYyajdsUU9JSm1wamI1UkuocpBNGJmDFNN9A9A5qAEWGpFfLPCn/RwH0iJFMHqh0EPhzk+PaLyY88bVxUQs0TOGZN2+fxt5I6sw+PS83zQ=; AMP_TOKEN=%24NOT_FOUND; SPC_EC=.SmtNcGJJWDN3UjZKZ2N4cv1rl72IJ5lsDxG0D9tDQuk4RjBKclYc41TcWsYQWU+2O12VxzXmX6JeaB4sL+Z64FJhyEh65u3DIMeVgjvn+pLzafxO2MUZXRuoW6sHQusduTMvkDex/A9uJ8rSLjN3Wr+hbCghFw/h22uQVyabj/4VXxerrK1Cfy70po7ZgOiyyF4Spg+oucIYjUCxR1C25Zb8yTm1/UuN8MAlhRv9kfl/6mFnz89WmIclB1iPX7Gu; _ga_SW6D8G0HXK=GS2.1.s1755791485$o9$g1$t1755797433$j58$l0$h1474871829; _ga=GA1.1.1565743168.1754156286; _dc_gtm_UA-61904553-8=1; shopee_webUnique_ccd=zFLX7C9fnQrVVsUFhoPfyQ%3D%3D%7Cuoiyyafj8%2FrZbdjYf8L8cGdT6wW3VdfXOI0uFnSIspvz0mkN7e5hk%2FOQP%2B1va0zrQTJGlowbBbIesw%3D%3D%7CRYNFiWet93oY7eic%7C08%7C3; ds=99ad5fc059dd5efd8fcbfadba62c4a58",
        studioId: studio1.id,
      },
      {
        nama_akun: "Yulinaelul",
        cookie:
          "_gcl_au=1.1.841245390.1754216996; _fbp=fb.2.1754216996387.487110115563501748; SPC_F=6UpcyHL58rrJn2XsfccLNWucNYua3iy0; REC_T_ID=cd5ea389-7054-11f0-b38b-3a63217053f6; SPC_CLIENTID=NlVwY3lITDU4cnJKbcvticessplcqilu; SPC_ST=.dktrcW1DM1NzN3JiYjBBSLrVXQqoUvKMPmAEgdl0crpTBkyNrRCejZXPNdqMMWsSraigokUvhnjcjalVPk41WfUx8WK1WbPkCTXlTLhNh5150T2I3dFTfZ2ow/GTnKCnHX38Q8u3bqRbT9vJYh633hXsESRVD2L+ndpXS9c1TABjjzBqCgC4+gwllfKN8LdjNsEzelbAY7YCtybZODhBuEaZyiJ3VbA7xSV0IHLpc2ogRCGvBy1/q28MyVQu+r0b; SPC_U=147587842; SPC_T_IV=dENiNHFpckNGTzBSRHpCOQ==; SPC_R_T_ID=aHA1/NeL/tTvvt1if/qSniBZ/ieG8MsHeOtGR46NPAatwia7U2v/irX+LgNUivFACpsLVpmIHs20NkdTFQgSNxeS9JCu8sAPf5sYwrSbjluNUeJAJdJC12o2ETH0QLrGBFzW/K3mtX64+nQiua/P9R9JX5LGTUgSBLVf7CVFCZI=; SPC_R_T_IV=dENiNHFpckNGTzBSRHpCOQ==; SPC_T_ID=aHA1/NeL/tTvvt1if/qSniBZ/ieG8MsHeOtGR46NPAatwia7U2v/irX+LgNUivFACpsLVpmIHs20NkdTFQgSNxeS9JCu8sAPf5sYwrSbjluNUeJAJdJC12o2ETH0QLrGBFzW/K3mtX64+nQiua/P9R9JX5LGTUgSBLVf7CVFCZI=; _ga_SW6D8G0HXK=GS2.1.s1755805659$o9$g0$t1755805659$j60$l0$h1926048823; SPC_SI=ixabaAAAAABxbDVEVWVwVbPjMgEAAAAAYmFsbDk3bWc=; SPC_EC=.TE1YRDNTYW13eldoWGpGWVmTbvyk4+KTq0OXiAwUcKS4bhI5YWbUmwJokYsVVjwtkqBsH/qgL+Fbhag3WZolQh7/OcTkcenZbqehqqXhzDVACWc9L4UBBNi+qorJJh53v2h7/XHqi719x8JTxjelwXDiPVjRqyKpdl4A7eoPuJE0UHU98+95dMIaklorIrJhpq8fjij1bSjQaE0JQQHdx0C7XmTjM3WP0KUGMzh1PpJhY1U1VuvN/q8Rzp/ugYgz; AMP_TOKEN=%24NOT_FOUND; _ga=GA1.3.1215020995.1754216998; _gid=GA1.3.1087463992.1755805660",
        studioId: studio2.id,
      },
      {
        nama_akun: "Zam zam",
        cookie:
          "_gcl_au=1.1.841245390.1754216996; _fbp=fb.2.1754216996387.487110115563501748; SPC_F=6UpcyHL58rrJn2XsfccLNWucNYua3iy0; REC_T_ID=cd5ea389-7054-11f0-b38b-3a63217053f6; SPC_CLIENTID=NlVwY3lITDU4cnJKbcvticessplcqilu; SPC_ST=.dktrcW1DM1NzN3JiYjBBSLrVXQqoUvKMPmAEgdl0crpTBkyNrRCejZXPNdqMMWsSraigokUvhnjcjalVPk41WfUx8WK1WbPkCTXlTLhNh5150T2I3dFTfZ2ow/GTnKCnHX38Q8u3bqRbT9vJYh633hXsESRVD2L+ndpXS9c1TABjjzBqCgC4+gwllfKN8LdjNsEzelbAY7YCtybZODhBuEaZyiJ3VbA7xSV0IHLpc2ogRCGvBy1/q28MyVQu+r0b; SPC_U=147587842; SPC_T_IV=dENiNHFpckNGTzBSRHpCOQ==; SPC_R_T_ID=aHA1/NeL/tTvvt1if/qSniBZ/ieG8MsHeOtGR46NPAatwia7U2v/irX+LgNUivFACpsLVpmIHs20NkdTFQgSNxeS9JCu8sAPf5sYwrSbjluNUeJAJdJC12o2ETH0QLrGBFzW/K3mtX64+nQiua/P9R9JX5LGTUgSBLVf7CVFCZI=; SPC_R_T_IV=dENiNHFpckNGTzBSRHpCOQ==; SPC_T_ID=aHA1/NeL/tTvvt1if/qSniBZ/ieG8MsHeOtGR46NPAatwia7U2v/irX+LgNUivFACpsLVpmIHs20NkdTFQgSNxeS9JCu8sAPf5sYwrSbjluNUeJAJdJC12o2ETH0QLrGBFzW/K3mtX64+nQiua/P9R9JX5LGTUgSBLVf7CVFCZI=; _ga_SW6D8G0HXK=GS2.1.s1755805659$o9$g0$t1755805659$j60$l0$h1926048823; SPC_SI=ixabaAAAAABxbDVEVWVwVbPjMgEAAAAAYmFsbDk3bWc=; SPC_EC=.TE1YRDNTYW13eldoWGpGWVmTbvyk4+KTq0OXiAwUcKS4bhI5YWbUmwJokYsVVjwtkqBsH/qgL+Fbhag3WZolQh7/OcTkcenZbqehqqXhzDVACWc9L4UBBNi+qorJJh53v2h7/XHqi719x8JTxjelwXDiPVjRqyKpdl4A7eoPuJE0UHU98+95dMIaklorIrJhpq8fjij1bSjQaE0JQQHdx0C7XmTjM3WP0KUGMzh1PpJhY1U1VuvN/q8Rzp/ugYgz; AMP_TOKEN=%24NOT_FOUND; _ga=GA1.3.1215020995.1754216998; _gid=GA1.3.1087463992.1755805660",
        studioId: studio3.id,
      },
      {
        nama_akun: "Siti",
        cookie:
          "_gcl_au=1.1.1100768810.1754218118; _fbp=fb.2.1754218118163.169370834900007512; SPC_F=V1ommx44zxKevs8hbJZz4cUUbly6JkoD; REC_T_ID=6a8c697a-7057-11f0-90a9-bad7cee522ad; SPC_R_T_ID=FwpGuPEO50xNhQOhLILGAB603q3YDUaUUMveiuZzkakdNyoVsexEatORDgi76xFDH7pHLX4FL+886285TCWEeEaoxfuGE3YyFDeEgd4U14RcE2Mw7MJ8pX/OFVvS6xaxtDiRUACTnojOHareEy1YNBSyGqlqWaSZyN7eLI0wbXs=; SPC_R_T_IV=M2cxRDdwM2ZKOW5td3Qzcw==; SPC_T_ID=FwpGuPEO50xNhQOhLILGAB603q3YDUaUUMveiuZzkakdNyoVsexEatORDgi76xFDH7pHLX4FL+886285TCWEeEaoxfuGE3YyFDeEgd4U14RcE2Mw7MJ8pX/OFVvS6xaxtDiRUACTnojOHareEy1YNBSyGqlqWaSZyN7eLI0wbXs=; SPC_T_IV=M2cxRDdwM2ZKOW5td3Qzcw==; SPC_CLIENTID=VjFvbW14NDR6eEtlzssvrltmefmkrhiu; _med=refer; language=id; _gid=GA1.3.1601039391.1755805828; _QPWSDCXHZQA=fd003932-f089-446b-ec22-c20af0b0b63b; REC7iLP4Q=23aeb9ec-4910-40d4-b78b-6c516b7200e2; _sapid=9fbd6e5b1bc5c9339ae0a25933aaeaaae16c25571b7ae02a3f1b71f7; _dc_gtm_UA-61904553-8=1; csrftoken=PugrnM8q6d45RWFkYMsWTM2DvQLZkJPw; SPC_U=-; SPC_SI=QhWbaAAAAABST3hDamtmTS78MgEAAAAAWmdRVU9tb3c=; AMP_TOKEN=%24NOT_FOUND; SPC_EC=.RWkzakYyMzRRaGNCRFk0NYXSTpzB74a4afX9MR1Z/leic//8kxrSlVzFQZa2Vla0CDcaih7kfUCSSlcOZYKwGai+1TfNAHVWi8Gw6EYm7NvbVLDByVyKohqO+jofVC1Cb9AcR4/oGBnLsVXDEGIGLBiYDlVzMKGdrwNvsICE1wgbE2oFq7JWPD3iIKj6Elco2B8RJStYON1k25qCXaeT3+RwGSUXOT4uo0BU9dyTU5lJDhajGfw1vQtmJOuiuCXd; SPC_ST=.WVdoeUh2b0JnSUFsMzhUMmF0P0VPKAaXKHhqCHUFM65+OSCT1li/PUSrC921mSd0O0fIFkeTJviNROXUYTlluF1480Agu2wSadZuKp1Qtl/hZVW0AcxtAY4fxKlaVyvdbSz6FTvpeMuVKviUs/xi4MKOTMPulQ5FRfUGJvubsO+dWgDSF5GMrqNO6mU5C2bcfqbakDrBNKnQrEMBTHtx25nFVfd4CKFsU+ohohs6xo5khFWOTy+s9bGvUwYiS+wh; shopee_webUnique_ccd=pcWvfE1EdWl3rRoSsLPFvA%3D%3D%7CCyZ%2BVdFxkCb5kPQP3OpX8uNsm3eSTqfcBMJqPRFlhSt7AJU0ycvdelqOsLsfYSz35NIyrmWG2ys%3D%7CH80r9gCgpZsFnLU9%7C08%7C3; ds=71a0bc7a97d211a1c95f9ac47a5969bd; _ga=GA1.3.1773910553.1754218121; _ga_SW6D8G0HXK=GS2.1.s1755805827$o2$g1$t1755805865$j22$l0$h4952815",
        studioId: studio3.id,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    console.log("✅ Seeding selesai");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
