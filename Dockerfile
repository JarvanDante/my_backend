FROM nginx:1.27-alpine

# 直接使用已打包产物（不在镜像内构建）
RUN apk add --no-cache unzip
COPY apps/web-ele/dist.zip /tmp/dist.zip
RUN rm -rf /usr/share/nginx/html/* \
  && unzip -q /tmp/dist.zip -d /usr/share/nginx/html \
  && rm -f /tmp/dist.zip

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
