// main.cpp - AuraRoutine Core Analytics Engine
//
// This is the C++ "microservice" described in the project brief. It is a
// short-lived console program: Node.js spawns it once per request, writes
// one JSON document to its stdin, and reads one JSON document back from
// its stdout. There is no persistent state inside the engine -- all state
// (tasks, logs) lives in the Node.js layer / database and is passed in
// fresh on every call.
//
// Usage:
//   ./engine optimize   < input.json
//   ./engine analytics  < input.json
//
// Build:
//   g++ -std=c++17 -O2 -o engine main.cpp
//
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>
#include <map>
#include <cmath>

#include "json_mini.hpp"

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Converts "HH:MM" into minutes since midnight. Falls back to 0 on bad input.
static int timeToMinutes(const std::string& hhmm) {
    if (hhmm.size() < 4 || hhmm.find(':') == std::string::npos) return 0;
    int h = 0, m = 0;
    size_t colon = hhmm.find(':');
    try {
        h = std::stoi(hhmm.substr(0, colon));
        m = std::stoi(hhmm.substr(colon + 1));
    } catch (...) {
        return 0;
    }
    return h * 60 + m;
}

// Converts minutes since midnight back into "HH:MM", wrapping past 24h
// (a task pushed past midnight will show as e.g. "25:30" so the frontend
// can clearly flag it as overflowing into the next day).
static std::string minutesToTime(int totalMinutes) {
    int h = totalMinutes / 60;
    int m = totalMinutes % 60;
    char buf[16];
    snprintf(buf, sizeof(buf), "%02d:%02d", h, m);
    return std::string(buf);
}

static int priorityWeight(const std::string& priority) {
    if (priority == "High") return 3;
    if (priority == "Medium") return 2;
    if (priority == "Low") return 1;
    return 1;
}

static double priorityMultiplierWeight(const std::string& priority) {
    if (priority == "High") return 1.0;
    if (priority == "Medium") return 0.7;
    if (priority == "Low") return 0.4;
    return 0.5;
}

// ---------------------------------------------------------------------------
// Feature 1: Smart Scheduler (conflict detection + re-sequencing)
// ---------------------------------------------------------------------------

struct ScheduleTask {
    std::string id;
    std::string name;
    std::string category;
    std::string priority;
    int originalStart = 0;
    int duration = 0;
    int originalEnd = 0;
    int finalStart = 0;
    int finalEnd = 0;
};

static bool overlaps(int startA, int endA, int startB, int endB) {
    return startA < endB && startB < endA;
}

static JsonValue runOptimize(const JsonValue& input) {
    const JsonValue& tasksJson = input["tasks"];
    std::vector<ScheduleTask> tasks;

    for (size_t i = 0; i < tasksJson.size(); ++i) {
        const JsonValue& t = tasksJson[i];
        ScheduleTask st;
        st.id = t["id"].asString();
        st.name = t["name"].asString();
        st.category = t["category"].asString("Uncategorized");
        st.priority = t["priority"].asString("Medium");
        st.originalStart = timeToMinutes(t["startTime"].asString("00:00"));
        st.duration = t["duration"].asInt(15);
        st.originalEnd = st.originalStart + st.duration;
        tasks.push_back(st);
    }

    // 1. Detect conflicts in the ORIGINAL schedule, before any adjustment,
    //    so the user can see exactly what clashed.
    JsonValue conflicts = JsonValue::makeArray();
    for (size_t i = 0; i < tasks.size(); ++i) {
        for (size_t j = i + 1; j < tasks.size(); ++j) {
            if (overlaps(tasks[i].originalStart, tasks[i].originalEnd,
                         tasks[j].originalStart, tasks[j].originalEnd)) {
                JsonValue c = JsonValue::makeObject();
                c.set("taskA", JsonValue::makeString(tasks[i].id));
                c.set("taskB", JsonValue::makeString(tasks[j].id));
                c.set("taskAName", JsonValue::makeString(tasks[i].name));
                c.set("taskBName", JsonValue::makeString(tasks[j].name));
                conflicts.push(c);
            }
        }
    }

    // 2. Build an optimized order: higher priority tasks keep their
    //    preferred start time; lower priority tasks that clash get pushed
    //    to start right after the conflicting task ends. Ties are broken
    //    by the original start time so the day still flows in a sane order.
    std::vector<ScheduleTask*> byPriority;
    for (auto& t : tasks) byPriority.push_back(&t);
    std::stable_sort(byPriority.begin(), byPriority.end(), [](ScheduleTask* a, ScheduleTask* b) {
        int wa = priorityWeight(a->priority), wb = priorityWeight(b->priority);
        if (wa != wb) return wa > wb;
        return a->originalStart < b->originalStart;
    });

    std::vector<ScheduleTask*> placed;
    for (auto* t : byPriority) {
        int start = t->originalStart;
        int end = start + t->duration;
        bool changed = true;
        // Nudge forward past any already-placed task it collides with.
        // This always terminates: each iteration only fires when `start`
        // strictly increases, and there are finitely many placed tasks.
        while (changed) {
            changed = false;
            for (auto* p : placed) {
                if (overlaps(start, end, p->finalStart, p->finalEnd)) {
                    start = p->finalEnd;
                    end = start + t->duration;
                    changed = true;
                }
            }
        }
        t->finalStart = start;
        t->finalEnd = end;
        placed.push_back(t);
    }

    // 3. Present the final schedule sorted chronologically.
    std::vector<ScheduleTask*> chronological = placed;
    std::sort(chronological.begin(), chronological.end(), [](ScheduleTask* a, ScheduleTask* b) {
        return a->finalStart < b->finalStart;
    });

    JsonValue optimizedTasks = JsonValue::makeArray();
    for (auto* t : chronological) {
        JsonValue ot = JsonValue::makeObject();
        ot.set("id", JsonValue::makeString(t->id));
        ot.set("name", JsonValue::makeString(t->name));
        ot.set("category", JsonValue::makeString(t->category));
        ot.set("priority", JsonValue::makeString(t->priority));
        ot.set("originalStartTime", JsonValue::makeString(minutesToTime(t->originalStart)));
        ot.set("suggestedStartTime", JsonValue::makeString(minutesToTime(t->finalStart)));
        ot.set("duration", JsonValue::makeNumber(t->duration));
        ot.set("wasShifted", JsonValue::makeBool(t->finalStart != t->originalStart));
        optimizedTasks.push(ot);
    }

    JsonValue result = JsonValue::makeObject();
    result.set("ok", JsonValue::makeBool(true));
    result.set("conflicts", conflicts);
    result.set("optimizedTasks", optimizedTasks);
    return result;
}

// ---------------------------------------------------------------------------
// Feature 2: Analytics & Streak Processing
// ---------------------------------------------------------------------------

static JsonValue runAnalytics(const JsonValue& input) {
    const JsonValue& logsJson = input["logs"];

    struct DayStat {
        int totalTasks = 0;
        int completedTasks = 0;
    };
    std::map<std::string, DayStat> byDate;          // date -> stats for streaks
    std::map<std::string, int> categoryTotal;
    std::map<std::string, int> categoryCompleted;

    int totalTasks = 0;
    int completedTasks = 0;
    double weightedPriorityTotal = 0.0;
    double weightedPriorityCompleted = 0.0;

    for (size_t i = 0; i < logsJson.size(); ++i) {
        const JsonValue& log = logsJson[i];
        std::string date = log["date"].asString();
        std::string category = log["category"].asString("Uncategorized");
        std::string priority = log["priority"].asString("Medium");
        bool completed = log["completed"].asBool(false);

        totalTasks++;
        if (completed) completedTasks++;

        byDate[date].totalTasks++;
        if (completed) byDate[date].completedTasks++;

        categoryTotal[category]++;
        if (completed) categoryCompleted[category]++;

        double w = priorityMultiplierWeight(priority);
        weightedPriorityTotal += w;
        if (completed) weightedPriorityCompleted += w;
    }

    // Completion rate across every logged task (0..1).
    double completionRate = totalTasks > 0 ? (double)completedTasks / totalTasks : 0.0;

    // Priority multiplier: weighted completion rate, where High-priority
    // tasks count for more than Low-priority ones. This rewards getting the
    // important things done, not just doing a high volume of easy tasks.
    double priorityMultiplier = weightedPriorityTotal > 0
        ? weightedPriorityCompleted / weightedPriorityTotal
        : 0.0;

    // Consistency Score, per the spec:
    //   Score = (CompletionRate * 0.7) + (PriorityMultiplier * 0.3)
    double consistencyScore = (completionRate * 0.7) + (priorityMultiplier * 0.3);

    // A day "counts" toward a streak if every task scheduled that day was
    // completed (totalTasks > 0 && completedTasks == totalTasks).
    std::vector<std::string> sortedDates;
    for (auto& kv : byDate) sortedDates.push_back(kv.first);
    std::sort(sortedDates.begin(), sortedDates.end()); // ISO dates sort chronologically as strings

    int longestStreak = 0;
    int runningStreak = 0;
    int currentStreak = 0;

    for (size_t i = 0; i < sortedDates.size(); ++i) {
        const DayStat& d = byDate[sortedDates[i]];
        bool dayWasSuccessful = d.totalTasks > 0 && d.completedTasks == d.totalTasks;
        if (dayWasSuccessful) {
            runningStreak++;
            longestStreak = std::max(longestStreak, runningStreak);
        } else {
            runningStreak = 0;
        }
    }
    // "Current" streak = the run ending at the most recent date in the log.
    for (auto it = sortedDates.rbegin(); it != sortedDates.rend(); ++it) {
        const DayStat& d = byDate[*it];
        bool dayWasSuccessful = d.totalTasks > 0 && d.completedTasks == d.totalTasks;
        if (dayWasSuccessful) currentStreak++;
        else break;
    }

    JsonValue categoryBreakdown = JsonValue::makeObject();
    for (auto& kv : categoryTotal) {
        const std::string& category = kv.first;
        int total = kv.second;
        int done = categoryCompleted.count(category) ? categoryCompleted[category] : 0;
        double pct = total > 0 ? (double)done / total * 100.0 : 0.0;
        JsonValue entry = JsonValue::makeObject();
        entry.set("total", JsonValue::makeNumber(total));
        entry.set("completed", JsonValue::makeNumber(done));
        entry.set("completionPct", JsonValue::makeNumber(std::round(pct * 10.0) / 10.0));
        categoryBreakdown.set(category, entry);
    }

    JsonValue result = JsonValue::makeObject();
    result.set("ok", JsonValue::makeBool(true));
    result.set("totalTasks", JsonValue::makeNumber(totalTasks));
    result.set("completedTasks", JsonValue::makeNumber(completedTasks));
    result.set("completionRate", JsonValue::makeNumber(std::round(completionRate * 1000.0) / 1000.0));
    result.set("priorityMultiplier", JsonValue::makeNumber(std::round(priorityMultiplier * 1000.0) / 1000.0));
    result.set("consistencyScore", JsonValue::makeNumber(std::round(consistencyScore * 1000.0) / 1000.0));
    result.set("currentStreak", JsonValue::makeNumber(currentStreak));
    result.set("longestStreak", JsonValue::makeNumber(longestStreak));
    result.set("categoryBreakdown", categoryBreakdown);
    return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

static std::string readAllStdin() {
    std::ostringstream ss;
    ss << std::cin.rdbuf();
    return ss.str();
}

int main(int argc, char** argv) {
    if (argc < 2) {
        JsonValue err = JsonValue::makeObject();
        err.set("ok", JsonValue::makeBool(false));
        err.set("error", JsonValue::makeString("Missing action argument. Use 'optimize' or 'analytics'."));
        std::cout << err.dump() << std::endl;
        return 1;
    }

    std::string action = argv[1];
    std::string rawInput = readAllStdin();

    try {
        JsonValue input = rawInput.empty() ? JsonValue::makeObject() : JsonValue::parse(rawInput);
        JsonValue result;

        if (action == "optimize") {
            result = runOptimize(input);
        } else if (action == "analytics") {
            result = runAnalytics(input);
        } else {
            JsonValue err = JsonValue::makeObject();
            err.set("ok", JsonValue::makeBool(false));
            err.set("error", JsonValue::makeString("Unknown action: " + action));
            std::cout << err.dump() << std::endl;
            return 1;
        }

        std::cout << result.dump() << std::endl;
        return 0;
    } catch (const std::exception& e) {
        JsonValue err = JsonValue::makeObject();
        err.set("ok", JsonValue::makeBool(false));
        err.set("error", JsonValue::makeString(std::string("Engine error: ") + e.what()));
        std::cout << err.dump() << std::endl;
        return 1;
    }
}
