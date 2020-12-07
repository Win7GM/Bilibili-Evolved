﻿using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Text;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace BilibiliEvolved.Build
{
  public partial class ProjectBuilder
  {
    public static bool ProductionMode { get; set; }
    public static ProjectBuilder CreateBuilder()
    {
      var configFile = new ConfigurationBuilder()
        .AddJsonFile(
          Path.Combine(Environment.CurrentDirectory, "builder/builder-config.json"),
          optional: false,
          reloadOnChange: false)
        .Build();
      var config = new BuilderConfig();
      configFile.Bind(config);

      return new ProjectBuilder(config);
    }
    public ProjectBuilder(BuilderConfig config)
    {
      this.config = config;
      SourcePath = config.Preview;
      // Source = File.ReadAllText(SourcePath);
      WriteInfo("[Bilibili Evolved] Project builder started.");
      WriteInfo($"Mode = {(ProductionMode ? "Production" : "Development")}");
      WriteInfo($"Working directory: {Environment.CurrentDirectory}");
      Console.WriteLine();
      var urlList = from file in Directory.GetFiles("min")
                    where !file.Contains("dark-slice") && !Path.GetFileName(file).StartsWith("bundle.")
                    select file.Replace(@"\", "/");
      Parallel.ForEach(urlList, url =>
      {
        CachedMinFiles[url] = File.ReadAllText(url);
      });
    }
    private BuilderConfig config;
    // public double MinimizedResourceLength { get; set; }
    // public double OriginalResourceLength { get; set; }
    public string Source { get; private set; }
    public string Output { get; private set; }
    public string SourcePath { get; private set; }
    public string OutputPath { get; set; } = "bilibili-evolved.user.js";
    public DateTime StartTime { get; private set; } = DateTime.Now;
    public void ResetBuildTime() => StartTime = DateTime.Now;
    public void BuildFinalOutput()
    {
      // var ratio = 100.0 * MinimizedResourceLength / OriginalResourceLength;
      if (ProductionMode) {
        var masterOutput = Output.Replace(@"// [Offline build placeholder]", compileOnlineData().Replace("Bilibili-Evolved/preview/", "Bilibili-Evolved/master/"));
        File.WriteAllText(OutputPath, masterOutput);
        Task.WaitAll(
          UserScriptTerser.WaitForExit(config.Master),
          UserScriptTerser.WaitForExit(config.Preview),
          UserScriptTerser.WaitForExit(config.Offline),
          UserScriptTerser.WaitForExit(config.PreviewOffline)
        );
      }
      Console.WriteLine();
      // WriteHint($"External resource size -{(100.0 - ratio):0.##}%");
      var elapsed = DateTime.Now - StartTime;
      WriteInfo($"Build complete in {elapsed:hh\\:mm\\:ss\\.ff}", ConsoleColor.Green);

      if (config.CopyOnBuild)
      {
        var text = File.ReadAllText(config.PreviewOffline);
        TextCopy.Clipboard.SetText(text);
        WriteHint($"Copied {text.Length} characters");
      }
    }
    public void WriteInfo(string message = "", ConsoleColor color = ConsoleColor.Gray)
    {
      if (string.IsNullOrWhiteSpace(message)) {
        return;
      }
      lock (this)
      {
        var lastColor = Console.ForegroundColor;
        Console.ForegroundColor = color;
        Console.WriteLine(message);
        Console.ForegroundColor = lastColor;
      }
    }
    public void WriteSuccess(string message) => WriteInfo(message, ConsoleColor.Blue);
    public void WriteError(string message) => WriteInfo(message, ConsoleColor.Red);
    public void WriteHint(string message) => WriteInfo(message, ConsoleColor.DarkGray);

    public ConcurrentDictionary<string, string> CachedMinFiles { get; private set; } = new ConcurrentDictionary<string, string>();
    public void UpdateCachedMinFile(string url)
    {
      url = url.Replace(@"\", "/");
      // Console.WriteLine($"Update min url: {url}");
      CachedMinFiles[url] = File.ReadAllText(url);
    }
  }
}
