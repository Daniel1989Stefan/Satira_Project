import Settings from "../models/Settings.js";

export const getSettings = async (req, res) => {
  try {
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

export const updateSettings = async (req, res) => {
  try {
    const {
      cookieText,
      disclaimerText,
      supportTitle,
      supportDescription,
      copyrightText,
      contact,
      termsAndConditionsText,
      privacyPolicyText,
      cookiePolicyText,
    } = req.body;

    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      {
        cookieText,
        disclaimerText,
        supportTitle,
        supportDescription,
        copyrightText,
        contact,
        termsAndConditionsText,
        privacyPolicyText,
        cookiePolicyText,
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
