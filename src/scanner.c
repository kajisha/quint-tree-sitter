#include "tree_sitter/parser.h"

enum TokenType {
  HASH_BANG_LINE,
  FILE_START,
};

typedef struct {
  bool at_start;
} Scanner;

void *tree_sitter_quint_external_scanner_create(void) {
  Scanner *scanner = calloc(1, sizeof(Scanner));
  scanner->at_start = true;
  return scanner;
}

void tree_sitter_quint_external_scanner_destroy(void *payload) {
  free(payload);
}

unsigned tree_sitter_quint_external_scanner_serialize(void *payload, char *buffer) {
  const Scanner *scanner = payload;
  buffer[0] = scanner->at_start;
  return 1;
}

void tree_sitter_quint_external_scanner_deserialize(
  void *payload,
  const char *buffer,
  unsigned length
) {
  Scanner *scanner = payload;
  scanner->at_start = length == 0 || buffer[0];
}

bool tree_sitter_quint_external_scanner_scan(
  void *payload,
  TSLexer *lexer,
  const bool *valid_symbols
) {
  Scanner *scanner = payload;

  if (!scanner->at_start) {
    return false;
  }

  if (
    valid_symbols[HASH_BANG_LINE] &&
    lexer->get_column(lexer) == 0 &&
    lexer->lookahead == '#'
  ) {
    lexer->advance(lexer, false);
    if (lexer->lookahead != '!') {
      return false;
    }

    do {
      lexer->advance(lexer, false);
    } while (lexer->lookahead != '\n' && !lexer->eof(lexer));

    scanner->at_start = false;
    lexer->result_symbol = HASH_BANG_LINE;
    return true;
  }

  if (valid_symbols[FILE_START]) {
    scanner->at_start = false;
    lexer->result_symbol = FILE_START;
    return true;
  }

  return false;
}
