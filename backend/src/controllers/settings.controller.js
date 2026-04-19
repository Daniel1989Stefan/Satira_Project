import Settings from "../models/Settings.js";

// 1. Obține setările (Public - accesibil oricui)
export const getSettings = async (req, res) => {
  try {
    // Căutăm primul document. Dacă nu există, folosim unul gol (care va lua valorile default din model)
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Eroare la getSettings:", error);
    return res
      .status(500)
      .json({ success: false, message: "Eroare la preluarea setărilor" });
  }
};

// 2. Actualizează setările (Protejat - doar pentru Admin)
export const updateSettings = async (req, res) => {
  try {
    const {
      cookieText,
      disclaimerText,
      supportTitle,
      supportDescription,
      copyrightText,
      contact,
    } = req.body;

    // Căutăm singurul document existent și îi facem update
    // Dacă nu există, îl creăm (upsert: true)
    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      {
        cookieText,
        disclaimerText,
        supportTitle,
        supportDescription,
        copyrightText,
        contact,
      },
      { new: true, upsert: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Setările au fost actualizate cu succes!",
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Eroare la updateSettings:", error);
    return res
      .status(500)
      .json({ success: false, message: "Eroare la salvarea setărilor" });
  }
};
