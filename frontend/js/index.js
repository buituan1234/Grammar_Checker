
    document.addEventListener("DOMContentLoaded", () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("animate") === "right") {
        document.body.classList.add("slide-in-right");
      }
    });

    document.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", e => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        e.preventDefault();
        document.body.style.opacity = 0;
        setTimeout(() => window.location.href = href, 300);
      });
    });
 