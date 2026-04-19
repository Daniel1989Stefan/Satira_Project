// export const firstUpperLetter = (string) => {
//   const splittedWord = string.split(" "); //imparte string-ul intr-un array cu atatea elemente cate spatii goale sunt in string

//   let correctedNameVersion = "";
//   const arrayWords = [];

//   for (let i = 0; i < splittedWord.length; i++) {
//     arrayWords.push(
//       splittedWord[i].charAt(0).toUpperCase() +
//         splittedWord[i].substring(1).toLowerCase(),
//     );
//   }
//   return (correctedNameVersion = arrayWords.join(" "));
// };

export const firstUpperLetter = (value = "") => {
  if (typeof value !== "string") return value;

  const splittedWord = value.trim().split(" ");

  let correctedNameVersion = "";
  const arrayWords = [];

  for (let i = 0; i < splittedWord.length; i++) {
    const word = splittedWord[i];

    // sari peste elementele goale (spații multiple)
    if (!word) continue;

    arrayWords.push(
      word.charAt(0).toUpperCase() + word.substring(1).toLowerCase(),
    );
  }

  correctedNameVersion = arrayWords.join(" ");
  return correctedNameVersion;
};
