//O clasă personalizată care extinde clasa Error pentru a oferi un format standardizat de erori (cod status, mesaj).

//Error pe care o extinzi este o clasă globală încorporată (built-in). Ea nu trebuie importată dintr-un fișier extern sau instalată ca pachet separat; este mereu disponibilă în mediul de execuție, la fel ca Console sau Array

class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    } //stack (sau mai precis Stack Trace) este "cutia neagră" a unei erori
  }
}

export { ApiError };
