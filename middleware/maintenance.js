const maintenanceMiddleware = (req, res, next) => {
  if (process.env.MODE === "maintenance") {
    if (
      req.originalUrl.startsWith("/") ||
      req.xhr ||
      (req.headers.accept && req.headers.accept.indexOf("json") > -1)
    ) {}
    const imgUrl =
      "https://uploader.danafxc.my.id/images/c559d0c0-c434-4909-a019-04f95733dab6.jpg";

    const htmlContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Site Maintenance</title>
                <style>
                    body {
                        margin: 0; padding: 0; height: 100vh; width: 100vw;
                        display: flex; flex-direction: column; justify-content: center; align-items: center;
                        background-color: #ffffff; color: #e2e8f0; font-family: sans-serif;
                    }
                    img {
                        max-width: 90%; max-height: 60vh; border-radius: 12px;
                        margin-bottom: 20px;
                    }
                    h1 { margin: 0; font-size: 1.5rem; color: #38bdf8; }
                    p { color: #94a3b8; margin-top: 10px; }
                </style>
            </head>
            <body>
                <img src="${imgUrl}" alt="maintenance mode">
            </body>
            </html>
        `;

    return res.status(503).send(htmlContent);
  }

  next();
};

module.exports = maintenanceMiddleware;
