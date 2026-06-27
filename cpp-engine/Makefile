CXX := g++
CXXFLAGS := -std=c++17 -O2 -Wall -Wextra
TARGET := engine
SRC := main.cpp

.PHONY: all clean test

all: $(TARGET)

$(TARGET): $(SRC) json_mini.hpp
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SRC)

# Quick smoke test: feeds a tiny schedule with a deliberate conflict through
# the optimizer, and a tiny log history through analytics.
test: $(TARGET)
	@echo "--- optimize ---"
	@echo '{"tasks":[{"id":"a","name":"Deep Work","startTime":"09:00","duration":60,"category":"Work","priority":"High"},{"id":"b","name":"Gym","startTime":"09:30","duration":45,"category":"Fitness","priority":"Medium"}]}' | ./$(TARGET) optimize
	@echo "--- analytics ---"
	@echo '{"logs":[{"date":"2026-06-24","taskId":"a","category":"Work","priority":"High","completed":true},{"date":"2026-06-24","taskId":"b","category":"Fitness","priority":"Medium","completed":true},{"date":"2026-06-25","taskId":"a","category":"Work","priority":"High","completed":true},{"date":"2026-06-25","taskId":"b","category":"Fitness","priority":"Medium","completed":false}]}' | ./$(TARGET) analytics

clean:
	rm -f $(TARGET)
