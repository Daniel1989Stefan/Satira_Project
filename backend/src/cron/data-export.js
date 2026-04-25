import cron from "node-cron";
import { User } from "../models/user.models.js";
import { Post } from "../models/post.models.js";
import { sendEmailWithAttachment } from "../utils/mail.js";
import { dataExportTemplate } from "../utils/mail.js";

export const startDataExportJob = () => {
  // Rulează în fiecare zi la 04:30 AM
  // Pentru teste manuale "* * * * *" (în fiecare minut)
  cron.schedule("30 4 * * *", async () => {
    // cron.schedule("* * * * *", async () => {
    //   console.log(
    //     "⏳ [CRON] Începe procesarea cererilor de export date (GDPR)...",
    //   );

    try {
      // 1. Găsim toți userii care au cerut datele
      const usersToProcess = await User.find({
        "dataExportRequest.isPending": true,
      });

      if (usersToProcess.length === 0) {
        return;
      }

      // 2. Procesăm fiecare user
      for (const user of usersToProcess) {
        try {
          const likedPosts = await Post.find({ likes: user._id })
            .select("title category createdAt")
            .lean();
          const dislikedPosts = await Post.find({ dislikes: user._id })
            .select("title category createdAt")
            .lean();

          // Construim JSON-ul
          const exportData = {
            generatedAt: new Date().toISOString(),
            accountInfo: {
              id: user._id,
              email: user.email,
              nickname: user.nickname,
              role: user.role,
              authProvider: user.authProvider,
              accountCreatedAt: user.createdAt,
            },
            activity: {
              likedPosts: likedPosts.map((p) => ({
                id: p._id,
                title: p.title,
                category: p.category,
              })),
              dislikedPosts: dislikedPosts.map((p) => ({
                id: p._id,
                title: p.title,
                category: p.category,
              })),
            },
          };

          const jsonString = JSON.stringify(exportData, null, 2);

          // Trimitem email-ul
          const emailSent = await sendEmailWithAttachment({
            email: user.email,
            subject: "Arhiva ta de date GDPR - Ziarul cu Minciuni",
            mailgenContent: dataExportTemplate(user.nickname || "Utilizator"),
            attachmentName: `date_personale_${user.nickname || "user"}.json`,
            attachmentContent: jsonString, // NodeMailer știe să transforme string-ul în fișier fizic atașat
          });

          // Dacă email-ul a plecat cu succes, scoatem bifa
          if (emailSent) {
            user.dataExportRequest.isPending = false;
            await user.save({ validateBeforeSave: false });
            console.log(`📧 [CRON] Export trimis către ${user.email}`);
          }
        } catch (innerError) {
          console.error(
            `❌ Eroare la procesarea userului ${user.email}:`,
            innerError,
          );
          // Trecem la următorul, nu oprim tot Cron-ul
        }
      }
    } catch (error) {
      console.error(
        "❌ [CRON] Eroare critică în Cron-ul de Export Date:",
        error,
      );
    }
  });
};
