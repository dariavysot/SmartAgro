FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY ["SmartAgro.Api/SmartAgro.Api.csproj", "SmartAgro.Api/"]
COPY ["SmartAgro.Core/SmartAgro.Core.csproj", "SmartAgro.Core/"]

RUN dotnet restore "SmartAgro.Api/SmartAgro.Api.csproj"

COPY . .
WORKDIR "/src/SmartAgro.Api"
RUN dotnet publish "SmartAgro.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SmartAgro.Api.dll"]