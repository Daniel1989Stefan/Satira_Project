import { returnValues } from "./validatorsValues.js";

const userRegisterValidator = () =>
  returnValues(["email", "password", "confirmPassword", "nickname"]);

const userLoginValidator = () => returnValues(["email", "loginPassword"]);

const userChangeCurrentPasswordValidator = () =>
  returnValues(["oldPassword", "newPassword", "confirmPassword"]);

const userForgotPasswordValidator = () => returnValues(["email"]);

const userResetForgotPasswordValidator = () =>
  returnValues(["newPassword", "confirmPassword"]);

const changeEmailValidator = () => returnValues(["newEmail", "loginPassword"]);

const changeNicknameValidator = () => returnValues(["newNickname"]);

const autoDeactivationAccountValidator = () =>
  returnValues(["autoDeactivate", "reason"]);

export {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  changeEmailValidator,
  changeNicknameValidator,
  autoDeactivationAccountValidator,
};
