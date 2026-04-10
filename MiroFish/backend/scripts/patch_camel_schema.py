import camel.toolkits.function_tool

_original_sanitize = camel.toolkits.function_tool.sanitize_and_enforce_required

def patched_sanitize(*args, **kwargs):
    result = _original_sanitize(*args, **kwargs)
    if 'function' in result and 'parameters' in result['function']:
        if 'properties' not in result['function']['parameters']:
            result['function']['parameters']['properties'] = {}
    return result

camel.toolkits.function_tool.sanitize_and_enforce_required = patched_sanitize
