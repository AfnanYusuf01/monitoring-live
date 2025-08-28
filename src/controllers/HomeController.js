import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const index = (req, res) => {
  res.render("index"); // otomatis cari index.ejs di folder views
};


export const getAccount = (req, res) => {
  res.render("account-management"); // otomatis cari index.ejs di folder views
};

