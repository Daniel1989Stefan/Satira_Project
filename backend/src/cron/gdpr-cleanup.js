import cron from "node-cron";
import { User } from "../models/user.models.js";
import { Post } from "../models/post.models.js";

export const startGDPRCleanupJob = () => {
  // Expresia '0 3 * * *' înseamnă: rulează în fiecare zi, la ora 03:00 AM
  // pt testare: * * * * * ~ in fiecare minut

  cron.schedule("0 3 * * *", async () => {
    //   cron.schedule("* * * * *", async () => {
    //     console.log(
    //       "⏳ [CRON] Începe procesul zilnic de curățare a datelor (GDPR)...",
    //     );

    try {
      const currentDate = new Date();

      // Căutăm utilizatorii care îndeplinesc TOATE condițiile:
      // 1. Au cerut ștergerea (isPendingDeletion: true)
      // 2. Data programată pentru ștergere a trecut (<= data curentă)
      // 3. NU sunt sub investigație legală (isUnderLegalHold: false sau inexistent)
      const usersToDelete = await User.find({
        "deletion.isPendingDeletion": true,
        "deletion.scheduledForDeletionAt": { $lte: currentDate },
        "deletion.isUnderLegalHold": { $ne: true },
      });

      if (usersToDelete.length === 0) {
        return;
      }

      console.log(
        `⚠️ [CRON] S-au găsit ${usersToDelete.length} conturi pentru ștergere definitivă.`,
      );

      for (const user of usersToDelete) {
        // OPȚIONAL: Dacă vrei să ștergi și datele asociate (Postări, Comentarii etc.)
        // await Post.deleteMany({ author: user._id });
        // await Comment.deleteMany({ user: user._id });

        // Ștergerea definitivă (Hard Delete) din baza de date
        await User.findByIdAndDelete(user._id);
        console.log(
          `🗑️ [CRON] Contul (${user.email}) a fost șters definitiv și irevocabil.`,
        );
      }
    } catch (error) {
      console.error(
        "❌ [CRON] Eroare critică în timpul curățării GDPR:",
        error,
      );
    }
  });
};
