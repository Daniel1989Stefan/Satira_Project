import DailyAnalytics from "../models/Analytics.js";

// data va fi  în format "YYYY-MM-DD"
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// 1. Funcția pentru userii care ACCEPTĂ cookie-urile
export const trackVisit = async (req, res) => {
  try {
    const { visitorId } = req.body;

    // Dacă frontend-ul nu a trimis ID-ul, ne oprim
    if (!visitorId) {
      return res.status(400).json({ error: "visitorId este obligatoriu" });
    }

    const todayDate = getTodayDateString();

    // Căutăm documentul de azi. Dacă nu există (e prima vizită din zi), îl creăm gol.
    let analytics = await DailyAnalytics.findOne({ date: todayDate });
    if (!analytics) {
      analytics = new DailyAnalytics({ date: todayDate });
    }

    // Verificăm dacă ID-ul vizitatorului este deja în lista de azi
    if (!analytics.uniqueVisitors.includes(visitorId)) {
      // E prima dată când intră azi -> îl adăugăm la vizitatori unici
      analytics.uniqueVisitors.push(visitorId);
    }

    // Indiferent dacă e vizitator nou sau a mai dat click azi, adăugăm +1 la afișări
    analytics.totalPageViews += 1;

    await analytics.save();
    return res
      .status(200)
      .json({ success: true, message: "Vizită înregistrată cu succes!" });
  } catch (error) {
    console.error("Eroare la trackVisit:", error);
    return res.status(500).json({ error: "Eroare internă de server" });
  }
};

// 2. Funcția pentru userii care REFUZĂ cookie-urile
export const trackRefusal = async (req, res) => {
  try {
    const todayDate = getTodayDateString();

    // Găsim ziua de azi sau o creăm
    let analytics = await DailyAnalytics.findOne({ date: todayDate });
    if (!analytics) {
      analytics = new DailyAnalytics({ date: todayDate });
    }

    //  NICIUN ID NU ESTE SALVAT!
    analytics.refusedAnalytics += 1;

    await analytics.save();
    return res
      .status(200)
      .json({ success: true, message: "Refuzul a fost contabilizat anonim!" });
  } catch (error) {
    console.error("Eroare la trackRefusal:", error);
    return res.status(500).json({ error: "Eroare internă de server" });
  }
};

// ==========================================
// 3. Funcția pentru ADMIN: Obține statisticile pe intervale
// ==========================================
export const getAnalyticsStats = async (req, res) => {
  try {
    // Așteptăm un query parametru: ?days=30 sau ?days=365
    // Dacă nu primim nimic, default este 30 de zile
    const days = parseInt(req.query.days) || 30;

    // Calculăm data de început (azi minus X zile)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Formatăm startDate ca "YYYY-MM-DD" ca să-l putem compara cu string-urile din DB
    const startDateString = startDate.toISOString().split("T")[0];

    // Căutăm toate documentele din baza de date a căror dată este mai mare sau egală cu data de început
    const analyticsData = await DailyAnalytics.find({
      date: { $gte: startDateString },
    });

    // Inițializăm contoarele pentru totaluri
    let totalUniqueVisitors = 0;
    let totalPageViews = 0;
    let totalRefusals = 0;

    // Adunăm datele din fiecare zi
    analyticsData.forEach((day) => {
      // Pentru unici adunăm lungimea array-ului din acea zi
      totalUniqueVisitors += day.uniqueVisitors.length;
      totalPageViews += day.totalPageViews;
      totalRefusals += day.refusedAnalytics;
    });

    return res.status(200).json({
      success: true,
      timeframe: `${days} zile`,
      startDate: startDateString,
      endDate: getTodayDateString(),
      stats: {
        totalUniqueVisitors,
        totalPageViews,
        totalRefusals,
      },
      // Putem trimite și datele brute pe zile (pentru un viitor grafic)
      dailyData: analyticsData,
    });
  } catch (error) {
    console.error("Eroare la getAnalyticsStats:", error);
    return res.status(500).json({ error: "Eroare la preluarea statisticilor" });
  }
};
