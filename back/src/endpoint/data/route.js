import express from "express";
import dataCtrl from "./controller.js";

const router = express.Router();

router.post("/insert", dataCtrl.insert);
router.post("/update", dataCtrl.update);
router.post("/delete", dataCtrl.delete);

export default router;
