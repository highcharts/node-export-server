FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_TEMP_DIR=/tmp/hc-export

# Install browser and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      fonts-noto \
      fonts-noto-color-emoji \
      fonts-noto-cjk \
      texlive-fonts-recommended \
      texlive-fonts-extra \
      cm-super \
      fontconfig \
      ca-certificates \
      curl \
      unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Highcharts export server fonts
RUN curl -fsSL https://assets.highcharts.com/export-srv/fonts.zip -o /tmp/fonts.zip \
    && mkdir -p /usr/share/fonts/highcharts \
    && unzip -o /tmp/fonts.zip -d /usr/share/fonts/highcharts \
    && rm /tmp/fonts.zip \
    && fc-cache -f

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .

# Set up temp folder
RUN mkdir -p /tmp/hc-export && chown -R node:node /app /tmp/hc-export

# Run as unprivileged node user
USER node

EXPOSE 7801

CMD ["node", "./bin/cli.js", "--enableServer", "1", "--loadConfig", "./docker/config.json"]
