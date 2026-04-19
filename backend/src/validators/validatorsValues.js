import { body } from "express-validator";

//email, password, confirmPassword, fullname, activationCode

export const returnValues = (fields = []) => {
  const validators = {
    email: body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email"),

    password: body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isStrongPassword({
        minLength: 12,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, one special character and must be at least 12 characters long",
      ),

    confirmPassword: body("confirmPassword")
      .trim()
      .notEmpty()
      .withMessage("Confirmation password is required"),

    fullname: body("fullname")
      .trim()
      .notEmpty()
      .withMessage("Fullname is required for admin and co-admins"),

    newFullname: body("newFullname")
      .trim()
      .notEmpty()
      .withMessage("New fullname is required"),

    activationCode: body("activationCode")
      .notEmpty()
      .withMessage("Admin activation code is required"),

    oldPassword: body("oldPassword")
      .notEmpty()
      .withMessage("Old password isrequired"),

    newPassword: body("newPassword")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isStrongPassword({
        minLength: 12,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, one special character and must be at least 12 characters long",
      ),
    temporaryPassword: body("temporaryPassword")
      .notEmpty()
      .withMessage("Old password isrequired"),

    loginPassword: body("loginPassword")
      .trim()
      .notEmpty()
      .withMessage("Password is required"),

    nickname: body("nickname")
      .trim()
      .optional() // Nickname-ul este opțional pentru admini
      .isLength({ min: 3 })
      .withMessage("Nickname must be at least 3 characters long"),

    newEmail: body("newEmail")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email"),

    newAdminEmail: body("newAdminEmail")
      .optional({ values: "falsy" })
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),

    newNickname: body("newNickname")
      .trim()
      .notEmpty()
      .withMessage("New nickname is required"),

    reason: body("reason")
      .trim()
      .notEmpty()
      .withMessage("Reason is required")
      .isLength({ min: 3, max: 200 }),
    autoDeactivate: body("autoDeactivate")
      .trim()
      .notEmpty()
      .withMessage(
        "Please confirm if you want to proceed with the deactivation",
      ),
    confirmEmail: body("confirmEmail").trim().notEmpty(),

    permissions: body("permissions")
      .exists()
      .withMessage("The permissions field is mandatory")
      .isObject()
      .withMessage(`"Permissions" must be an object`)
      .custom((value) => {
        // 1. Verificăm să nu fie gol
        if (Object.keys(value).length === 0) {
          throw new Error(`Object 'permissions' cannot be empty`);
        }

        // 2. Verificăm ca TOATE valorile din interior să fie strict de tip boolean (true/false)
        for (const [key, val] of Object.entries(value)) {
          if (typeof val !== "boolean") {
            throw new Error(
              `The value for permission '${key}' must be a boolean (true or false)`,
            );
          }
        }

        return true; // Dacă trece de for-loop, totul e corect
      }),

    title: body("title").trim().notEmpty().withMessage("Title is required"),
  };

  return fields
    .filter((field) => validators.hasOwnProperty(field))
    .map((field) => validators[field]);
};
