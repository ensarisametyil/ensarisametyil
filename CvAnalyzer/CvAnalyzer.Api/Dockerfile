# Production image for CvAnalyzer.Api (CVora AI backend).
#
# Build (from the CvAnalyzer/ directory, so both projects' relative references resolve):
#   docker build -f CvAnalyzer.Api/Dockerfile -t cvora-ai-backend .
#
# Run:
#   docker run -p 8080:8080 \
#     -e ConnectionStrings__DefaultConnection="Host=...;Database=...;Username=...;Password=..." \
#     -e Jwt__SigningKey="<32+ char random string>" \
#     -e ASPNETCORE_ENVIRONMENT=Production \
#     cvora-ai-backend
#
# No secret is ever baked into this image — every value above is read from the environment at
# container start (see docs/deployment.md and docs/production.md for the full variable list).

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files first so `dotnet restore` is cached across builds that only change source.
COPY CvAnalyzer.Api/CvAnalyzer.Api.csproj CvAnalyzer.Api/
RUN dotnet restore CvAnalyzer.Api/CvAnalyzer.Api.csproj

COPY CvAnalyzer.Api/ CvAnalyzer.Api/
RUN dotnet publish CvAnalyzer.Api/CvAnalyzer.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Run as a non-root user rather than the image's default root.
RUN adduser --disabled-password --gecos "" --uid 5678 appuser

# Pre-create the CV storage mount point and own it — LocalFileStorageService writes here (see
# docker-compose.prod.yml's FileStorage__RootPath=/data/cv-uploads). When a named volume is
# mounted over an empty directory that already exists in the image, Docker seeds the volume's
# initial content/ownership from it — without this, the volume would mount as root-owned and
# appuser couldn't write to it.
RUN mkdir -p /data/cv-uploads && chown -R appuser:appuser /data

USER appuser

COPY --from=build --chown=appuser:appuser /app .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "CvAnalyzer.Api.dll"]
