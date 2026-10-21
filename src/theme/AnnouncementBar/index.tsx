import React, { useEffect, useState } from "react";
import Link from "@docusaurus/Link";
import AnnouncementBar from "@theme-original/AnnouncementBar";
import AnnouncementBarCloseButton from "@theme/AnnouncementBar/CloseButton";

// Docusaurus supports a single announcement bar, so the research bar is
// rendered under it here. The inline headTags script in docusaurus.config.ts
// reads the same key before paint, so a dismissed bar never flashes.
const RESEARCH_DISMISS_KEY = "jsr.research-bar.dismissed";

function ResearchBar() {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        try {
            setDismissed(localStorage.getItem(RESEARCH_DISMISS_KEY) === "true");
        } catch {}
    }, []);

    if (dismissed) {
        return null;
    }

    const close = () => {
        try {
            localStorage.setItem(RESEARCH_DISMISS_KEY, "true");
        } catch {}
        setDismissed(true);
    };

    return (
        <div className="jsr-bar jsr-bar--research" role="banner">
            <div className="jsr-bar__placeholder" />
            <div className="jsr-bar__content">
                <Link className="jsr-announce" to="/research">
                    <span className="jsr-announce__pill">New</span>
                    <span className="jsr-announce__text jsr-hide-sm">
                        JS Recon is backed by academic research
                    </span>
                    <span className="jsr-announce__text jsr-show-sm">
                        Backed by research
                    </span>
                    <span className="jsr-announce__cta">
                        Read the papers <span aria-hidden="true">→</span>
                    </span>
                </Link>
            </div>
            <AnnouncementBarCloseButton
                onClick={close}
                className="jsr-bar__close"
            />
        </div>
    );
}

export default function AnnouncementBarWrapper(props) {
    return (
        <>
            <AnnouncementBar {...props} />
            <ResearchBar />
        </>
    );
}
