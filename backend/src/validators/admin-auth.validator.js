import { returnValues } from "./validatorsValues.js";

const registeradminValidator = () =>
  returnValues([
    "email",
    "confirmEmail",
    "password",
    "confirmPassword",
    "fullname",
    "activationCode",
  ]);

const registerCoAdminValidator = () => returnValues(["email", "fullname"]);

const loginValidator = () => returnValues(["email", "loginPassword"]);

const changePasswordValidator = () =>
  returnValues(["password", "confirmPassword"]);

const forgotPasswordValidator = () => returnValues(["email"]);

const changeCurrentPasswordValidator = () =>
  returnValues(["oldPassword", "newPassword", "confirmPassword"]);

const changeTemporaryPasswordValidator = () =>
  returnValues(["temporaryPassword", "newPassword", "confirmPassword"]);

const changeForgotPasswordValidator = () =>
  returnValues(["newPassword", "confirmPassword"]);

const changeCoAdminEmailValidator = () => returnValues(["email", "newEmail"]);

const changeCoAdminFullnameValidator = () =>
  returnValues(["email", "newFullname"]);

const changeEmailValidator = () =>
  returnValues(["loginPassword", "newEmail", "confirmEmail"]);

const changeFullnameValidator = () =>
  returnValues(["loginPassword", "newFullname"]);

const disableValidator = () => returnValues(["email", "reason"]);

const reactivateAccountValidator = () => returnValues(["email"]);

const editPermissionsValidator = () => returnValues(["email", "permissions"]);

const createPostValidator = () => returnValues(["title"]);

export {
  registeradminValidator,
  registerCoAdminValidator,
  loginValidator,
  changePasswordValidator,
  changeCurrentPasswordValidator,
  forgotPasswordValidator,
  changeTemporaryPasswordValidator,
  changeForgotPasswordValidator,
  changeCoAdminEmailValidator,
  changeCoAdminFullnameValidator,
  changeEmailValidator,
  changeFullnameValidator,
  disableValidator,
  reactivateAccountValidator,
  editPermissionsValidator,
  createPostValidator,
};
