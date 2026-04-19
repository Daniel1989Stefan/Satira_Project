//Un wrapper care prinde erorile din funcțiile asincrone și le trimite automat către middleware-ul de erori, evitând blocarea serverului.

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
