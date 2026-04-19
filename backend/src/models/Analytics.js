import mongoose from "mongoose";

const dailyAnalyticsSchema = new mongoose.Schema(
  {
    // Salvăm data ca string (ex: '2026-04-16') pentru a avea un singur document pe zi
    date: {
      type: String,
      required: true,
      unique: true,
    },
    // Lista cu ID-urile vizitatorilor care au dat ACCEPT
    uniqueVisitors: [
      {
        type: String,
      },
    ],
    // De câte ori au fost încărcate paginile în ziua respectivă (afișări totale)
    totalPageViews: {
      type: Number,
      default: 0,
    },
    // Contorul anonim pentru cei care au apăsat REFUZ
    refusedAnalytics: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Adăugăm o proprietate virtuală ca să citim ușor numărul total de vizitatori unici (lungimea array-ului)
dailyAnalyticsSchema.virtual("uniqueVisitorsCount").get(function () {
  return this.uniqueVisitors.length;
});

const DailyAnalytics = mongoose.model("DailyAnalytics", dailyAnalyticsSchema);

export default DailyAnalytics;
