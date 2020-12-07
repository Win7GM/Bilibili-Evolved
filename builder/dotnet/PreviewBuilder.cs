﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace BilibiliEvolved.Build
{
  partial class ProjectBuilder
  {
    private string onlineVersion;
    private string compileOnlineData()
    {
      var onlineRoot = $"https://raw.githubusercontent.com/{config.Owner}/Bilibili-Evolved/preview/";
      // var urlList = from file in Directory.GetFiles("min")
      //               where !file.Contains("dark-slice") && !Path.GetFileName(file).StartsWith("bundle.")
      //               select file.Replace(@"\", "/");
      var onlineData = "const onlineData = {};" + Environment.NewLine;
      foreach (var (url, text) in CachedMinFiles.OrderBy(p => p.Key))
      {
        if (url.EndsWith(".js"))
        {
          onlineData = onlineData + $"onlineData[\"{onlineRoot + url}\"] = {text}" + Environment.NewLine;
        }
        else
        {
          onlineData = onlineData + $"onlineData[\"{onlineRoot + url}\"] = `{text.Replace("\\", "\\\\")}`;" + Environment.NewLine;
        }
      }
      return onlineData;
    }
    public ProjectBuilder BuildVersions()
    {
      var version = new Regex(@"//[ ]*@version[ ]*(.+)").Match(Source).Groups[1].Value.Trim();
      Source = ownerRegex
        .Replace(Source, "${1}" + config.Owner + "${3}");
      // File.WriteAllText(SourcePath, Source);
      File.WriteAllText("version.txt", version);
      onlineVersion = version;
      return this;
    }
    public ProjectBuilder BuildPreviewData()
    {
      if (ProductionMode) {
        File.WriteAllText(SourcePath, Source.Replace(@"// [Offline build placeholder]", compileOnlineData()));
      }
      return this;
    }
  }
}
