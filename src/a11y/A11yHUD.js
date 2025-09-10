// src/a11y/A11yHUD.jsx
import { createPortal } from "react-dom";
import A11yFab from "./A11yFab";
import A11yToolkit from "./A11yToolkit";
import ReadAloud from "./ReadAloud";

export default function A11yHUD({ mainId = "main", targetSelector = "#main" }) {
  return createPortal(
    <>
      {/* האייקון שפותח/סוגר את שניהם */}
      <A11yFab side="left" />

      {/* כלי הנגישות */}
      <A11yToolkit mainId={mainId} />
      <ReadAloud targetSelector={targetSelector} />
    </>,
    document.body
  );
}
