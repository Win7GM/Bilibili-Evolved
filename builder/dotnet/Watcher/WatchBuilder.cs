using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Linq;
using System.Threading.Tasks;

namespace BilibiliEvolved.Build.Watcher
{
  public class WatchBuilder
  {
    private List<Watcher> watchers = new List<Watcher>{
      new ClientWatcher(),
      new JavaScriptWatcher(),
      new CssWatcher(),
      new HtmlWatcher(),
      new TypeScriptWatcher(),
      new SassWatcher(),
      new VueWatcher(),
    };
    private ProjectBuilder builder = ProjectBuilder.CreateBuilder();
    public bool IsWatching => watchers.All(w => w.IsWatching);
    public void StartWatching()
    {
      builder
        .BuildClient()
        .BuildVersions()
        .BuildMaster();
      var queue = new Queue<FileSystemEventArgs>();
      async void rebuild()
      {
        await Task.Run(() =>
        {
          lock (builder)
          {
            builder.ResetBuildTime();
            builder
              .BuildBundle()
              .BuildPreviewOffline()
              .BuildOffline()
              .BuildPreviewData()
              .BuildFinalOutput();
          }
        });
        lock (queue)
        {
          if (queue.Count > 1)
          {
            while (queue.Count > 1)
            {
              queue.TryDequeue(out var e);
              // Console.WriteLine($"dequeued {e.FullPath}");
            }
            // Console.WriteLine($"restarting rebuild");
            rebuild();
          }
          else if (queue.Count == 1)
          {
            queue.Clear();
            // Console.WriteLine($"rebuild complete with clean queue");
            return;
          }
          else
          {
            throw new Exception("Invalid state of queue!");
          }
        }
      }
      var notifyRebuild = Extensions.Debounce((FileSystemEventArgs e) =>
      {
        if (!Path.GetFileNameWithoutExtension(e.FullPath).EndsWith(".vue"))
        {
          lock (queue)
          {
            queue.Enqueue(e);
            // Console.WriteLine($"enqueue to {queue.Count}");
            if (queue.Count == 1)
            {
              rebuild();
            }
          }
        }
      }, Watcher.HandleFileChangesPeriod);
      watchers.ForEach(w =>
      {
        w.Start(builder);
        w.FileChanged += notifyRebuild;
        w.FileDeleted += notifyRebuild;
      });
      builder.WriteInfo("Watcher started, input 'q' or press 'Ctrl + C' to exit.");
      var input = "";
      Console.CancelKeyPress += (s, e) =>
      {
        StopWatching();
      };
      while (input != null && input.ToLowerInvariant() != "q")
      {
        input = Console.ReadLine();
      }
      if (input != null)
      {
        StopWatching();
      }
    }
    private void StopWatching()
    {
      watchers.Where(w => w.IsWatching).ForEach(w => w.Stop());
      builder.WriteInfo("Watcher stopped.");
      Environment.Exit(0);
    }
  }
}
