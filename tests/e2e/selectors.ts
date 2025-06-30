// Common selectors definition
export const selectors = {
  admin: {
    loginEmail: 'input[type="email"]',
    loginPassword: 'input[type="password"]',
    loginSubmit: 'button[type="submit"]',
    dashboardTitle: 'h1:has-text("繝繝・す繝･繝懊・繝・)',
    sidebarCharacters: 'a:has-text("繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・)',
    sidebarTokens: 'a:has-text("繝医・繧ｯ繝√こ繝・ヨ邂｡逅・)',
    sidebarUsers: 'a:has-text("繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・)',
  },
  character: {
    createButton: 'button:has-text("譁ｰ隕丈ｽ懈・")',
    editButton: 'button:has-text("邱ｨ髮・)',
    deleteButton: 'button:has-text("蜑企勁")',
    saveButton: 'button:has-text("菫晏ｭ・)',
    nameInput: 'input[name="name.ja"]',
    descriptionInput: 'textarea[name="description.ja"]',
  },
  token: {
    packTab: 'button:has-text("繝代ャ繧ｯ邂｡逅・)',
    userTab: 'button:has-text("繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・)',
    createPackButton: 'button:has-text("譁ｰ隕丈ｽ懈・")',
    packNameInput: 'input[name="name"]',
    packPriceInput: 'input[name="price"]',
    packTokenInput: 'input[name="tokenAmount"]',
  },
  common: {
    successToast: '.toast-success, .success-message, [role="alert"]:has-text("謌仙粥")',
    errorToast: '.toast-error, .error-message, [role="alert"]:has-text("繧ｨ繝ｩ繝ｼ")',
    modalOverlay: '.modal-overlay, [role="dialog"]',
  }
};