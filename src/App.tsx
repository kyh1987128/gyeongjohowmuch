import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { TossAds } from "@apps-in-toss/web-framework";

function App() {
  useEffect(() => {
    if (TossAds.initialize.isSupported()) {
      TossAds.initialize({
        callbacks: {
          onInitialized: () => console.log("TossAds 초기화 완료"),
          onInitializationFailed: (error) =>
            console.error("TossAds 초기화 실패:", error),
        },
      });
    }
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AppRoutes />
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
