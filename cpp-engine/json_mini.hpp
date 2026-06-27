// json_mini.hpp
// A tiny, dependency-free JSON value type with a recursive-descent parser
// and a serializer. This is intentionally minimal: it supports exactly the
// JSON shapes AuraRoutine needs (objects, arrays, strings, numbers, bools,
// null) and is not meant as a general-purpose JSON library.
//
// Usage:
//   JsonValue v = JsonValue::parse(someString);
//   double x = v["tasks"][0]["duration"].asNumber();
//   std::string s = v.dump();
//
#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <cctype>
#include <cmath>

class JsonValue {
public:
    enum class Type { Null, Bool, Number, String, Array, Object };

    Type type = Type::Null;
    bool boolValue = false;
    double numberValue = 0.0;
    std::string stringValue;
    std::vector<JsonValue> arrayValue;
    // Use a vector of pairs instead of std::map so we preserve insertion order,
    // which makes debugging output and tests easier to read.
    std::vector<std::pair<std::string, JsonValue>> objectValue;

    JsonValue() : type(Type::Null) {}
    static JsonValue makeNull() { return JsonValue(); }
    static JsonValue makeBool(bool b) { JsonValue v; v.type = Type::Bool; v.boolValue = b; return v; }
    static JsonValue makeNumber(double n) { JsonValue v; v.type = Type::Number; v.numberValue = n; return v; }
    static JsonValue makeString(const std::string& s) { JsonValue v; v.type = Type::String; v.stringValue = s; return v; }
    static JsonValue makeArray() { JsonValue v; v.type = Type::Array; return v; }
    static JsonValue makeObject() { JsonValue v; v.type = Type::Object; return v; }

    bool isNull() const { return type == Type::Null; }
    bool isObject() const { return type == Type::Object; }
    bool isArray() const { return type == Type::Array; }

    double asNumber(double fallback = 0.0) const {
        if (type == Type::Number) return numberValue;
        return fallback;
    }
    int asInt(int fallback = 0) const {
        if (type == Type::Number) return static_cast<int>(std::lround(numberValue));
        return fallback;
    }
    bool asBool(bool fallback = false) const {
        if (type == Type::Bool) return boolValue;
        return fallback;
    }
    std::string asString(const std::string& fallback = "") const {
        if (type == Type::String) return stringValue;
        return fallback;
    }

    // Object field access (returns Null JsonValue if missing or not an object).
    const JsonValue& operator[](const std::string& key) const {
        static JsonValue nullVal;
        if (type != Type::Object) return nullVal;
        for (auto& kv : objectValue) {
            if (kv.first == key) return kv.second;
        }
        return nullVal;
    }

    bool has(const std::string& key) const {
        if (type != Type::Object) return false;
        for (auto& kv : objectValue) if (kv.first == key) return true;
        return false;
    }

    void set(const std::string& key, const JsonValue& value) {
        if (type != Type::Object) { type = Type::Object; objectValue.clear(); }
        for (auto& kv : objectValue) {
            if (kv.first == key) { kv.second = value; return; }
        }
        objectValue.emplace_back(key, value);
    }

    void push(const JsonValue& value) {
        if (type != Type::Array) { type = Type::Array; arrayValue.clear(); }
        arrayValue.push_back(value);
    }

    // Array element access (returns Null JsonValue if out of range or not an array).
    const JsonValue& operator[](size_t idx) const {
        static JsonValue nullVal;
        if (type != Type::Array || idx >= arrayValue.size()) return nullVal;
        return arrayValue[idx];
    }

    size_t size() const {
        if (type == Type::Array) return arrayValue.size();
        if (type == Type::Object) return objectValue.size();
        return 0;
    }

    // ---------- Parsing ----------
    static JsonValue parse(const std::string& text) {
        size_t pos = 0;
        skipWhitespace(text, pos);
        JsonValue v = parseValue(text, pos);
        return v;
    }

    // ---------- Serialization ----------
    std::string dump() const {
        std::ostringstream out;
        write(out);
        return out.str();
    }

private:
    void write(std::ostringstream& out) const {
        switch (type) {
            case Type::Null: out << "null"; break;
            case Type::Bool: out << (boolValue ? "true" : "false"); break;
            case Type::Number: {
                // Print integers without a trailing ".0" for readability.
                if (std::floor(numberValue) == numberValue && std::abs(numberValue) < 1e15) {
                    out << static_cast<long long>(numberValue);
                } else {
                    out << numberValue;
                }
                break;
            }
            case Type::String: writeEscapedString(out, stringValue); break;
            case Type::Array: {
                out << "[";
                for (size_t i = 0; i < arrayValue.size(); ++i) {
                    if (i) out << ",";
                    arrayValue[i].write(out);
                }
                out << "]";
                break;
            }
            case Type::Object: {
                out << "{";
                for (size_t i = 0; i < objectValue.size(); ++i) {
                    if (i) out << ",";
                    writeEscapedString(out, objectValue[i].first);
                    out << ":";
                    objectValue[i].second.write(out);
                }
                out << "}";
                break;
            }
        }
    }

    static void writeEscapedString(std::ostringstream& out, const std::string& s) {
        out << '"';
        for (char c : s) {
            switch (c) {
                case '"': out << "\\\""; break;
                case '\\': out << "\\\\"; break;
                case '\n': out << "\\n"; break;
                case '\r': out << "\\r"; break;
                case '\t': out << "\\t"; break;
                default:
                    if (static_cast<unsigned char>(c) < 0x20) {
                        char buf[8];
                        snprintf(buf, sizeof(buf), "\\u%04x", c);
                        out << buf;
                    } else {
                        out << c;
                    }
            }
        }
        out << '"';
    }

    static void skipWhitespace(const std::string& s, size_t& pos) {
        while (pos < s.size() && std::isspace(static_cast<unsigned char>(s[pos]))) pos++;
    }

    static JsonValue parseValue(const std::string& s, size_t& pos) {
        skipWhitespace(s, pos);
        if (pos >= s.size()) throw std::runtime_error("Unexpected end of JSON input");
        char c = s[pos];
        if (c == '{') return parseObject(s, pos);
        if (c == '[') return parseArray(s, pos);
        if (c == '"') return JsonValue::makeString(parseString(s, pos));
        if (c == 't' || c == 'f') return parseBool(s, pos);
        if (c == 'n') { pos += 4; return JsonValue::makeNull(); }
        return parseNumber(s, pos);
    }

    static JsonValue parseObject(const std::string& s, size_t& pos) {
        JsonValue obj = JsonValue::makeObject();
        pos++; // {
        skipWhitespace(s, pos);
        if (pos < s.size() && s[pos] == '}') { pos++; return obj; }
        while (true) {
            skipWhitespace(s, pos);
            std::string key = parseString(s, pos);
            skipWhitespace(s, pos);
            if (pos >= s.size() || s[pos] != ':') throw std::runtime_error("Expected ':' in object");
            pos++; // :
            JsonValue val = parseValue(s, pos);
            obj.objectValue.emplace_back(key, val);
            skipWhitespace(s, pos);
            if (pos < s.size() && s[pos] == ',') { pos++; continue; }
            if (pos < s.size() && s[pos] == '}') { pos++; break; }
            throw std::runtime_error("Expected ',' or '}' in object");
        }
        return obj;
    }

    static JsonValue parseArray(const std::string& s, size_t& pos) {
        JsonValue arr = JsonValue::makeArray();
        pos++; // [
        skipWhitespace(s, pos);
        if (pos < s.size() && s[pos] == ']') { pos++; return arr; }
        while (true) {
            JsonValue val = parseValue(s, pos);
            arr.arrayValue.push_back(val);
            skipWhitespace(s, pos);
            if (pos < s.size() && s[pos] == ',') { pos++; continue; }
            if (pos < s.size() && s[pos] == ']') { pos++; break; }
            throw std::runtime_error("Expected ',' or ']' in array");
        }
        return arr;
    }

    static std::string parseString(const std::string& s, size_t& pos) {
        if (s[pos] != '"') throw std::runtime_error("Expected '\"' to start string");
        pos++; // opening quote
        std::string out;
        while (pos < s.size() && s[pos] != '"') {
            char c = s[pos];
            if (c == '\\' && pos + 1 < s.size()) {
                char next = s[pos + 1];
                switch (next) {
                    case '"': out += '"'; break;
                    case '\\': out += '\\'; break;
                    case '/': out += '/'; break;
                    case 'n': out += '\n'; break;
                    case 't': out += '\t'; break;
                    case 'r': out += '\r'; break;
                    case 'b': out += '\b'; break;
                    case 'f': out += '\f'; break;
                    case 'u': {
                        // Minimal \uXXXX handling: only supports basic ASCII range well,
                        // which is sufficient for the task/category names this app uses.
                        if (pos + 5 < s.size()) {
                            std::string hex = s.substr(pos + 2, 4);
                            int codepoint = std::stoi(hex, nullptr, 16);
                            if (codepoint < 0x80) out += static_cast<char>(codepoint);
                            pos += 4;
                        }
                        break;
                    }
                    default: out += next;
                }
                pos += 2;
            } else {
                out += c;
                pos++;
            }
        }
        if (pos >= s.size()) throw std::runtime_error("Unterminated string");
        pos++; // closing quote
        return out;
    }

    static JsonValue parseBool(const std::string& s, size_t& pos) {
        if (s.compare(pos, 4, "true") == 0) { pos += 4; return JsonValue::makeBool(true); }
        if (s.compare(pos, 5, "false") == 0) { pos += 5; return JsonValue::makeBool(false); }
        throw std::runtime_error("Invalid literal");
    }

    static JsonValue parseNumber(const std::string& s, size_t& pos) {
        size_t start = pos;
        if (pos < s.size() && (s[pos] == '-' || s[pos] == '+')) pos++;
        while (pos < s.size() && (std::isdigit(static_cast<unsigned char>(s[pos])) || s[pos] == '.' ||
                                   s[pos] == 'e' || s[pos] == 'E' || s[pos] == '-' || s[pos] == '+')) {
            pos++;
        }
        std::string numStr = s.substr(start, pos - start);
        if (numStr.empty()) throw std::runtime_error("Invalid number");
        return JsonValue::makeNumber(std::stod(numStr));
    }
};
