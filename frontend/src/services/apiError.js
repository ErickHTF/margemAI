// Mensagem de erro amigável a partir de um erro do axios: usa a mensagem enviada pelo
// backend (ErrorResponse.message) e, na falta dela, o texto em português informado.
export function getApiErrorMessage(err, fallback) {
  return err?.response?.data?.message || fallback
}

export default getApiErrorMessage
