#!/usr/bin/env python3
"""
ESPHome YAML Validator - handles !secret tags and basic ESPHome validation
"""

import yaml
import sys
import os
import re

class ESPHomeSecretLoader(yaml.SafeLoader):
    """Custom YAML loader that handles ESPHome tags"""
    
    def __init__(self, stream):
        super().__init__(stream)
        # Add constructors for ESPHome-specific tags
        ESPHomeSecretLoader.add_constructor('!secret', self._secret_constructor)
        ESPHomeSecretLoader.add_constructor('!include', self._include_constructor)  
        ESPHomeSecretLoader.add_constructor('!lambda', self._lambda_constructor)
        ESPHomeSecretLoader.add_constructor('!extend', self._extend_constructor)
        
    @staticmethod 
    def _secret_constructor(loader, node):
        """Handle !secret tags by returning a placeholder"""
        return f"SECRET:{node.value}"
        
    @staticmethod
    def _include_constructor(loader, node):
        """Handle !include tags by returning a placeholder"""
        return f"INCLUDE:{node.value}"
        
    @staticmethod
    def _lambda_constructor(loader, node):
        """Handle !lambda tags by returning a placeholder"""
        if isinstance(node, yaml.ScalarNode):
            return f"LAMBDA:{node.value}"
        else:
            return "LAMBDA:function"
            
    @staticmethod
    def _extend_constructor(loader, node):
        """Handle !extend tags by returning a placeholder"""  
        return f"EXTEND:{node.value}"

def validate_esphome_yaml(yaml_file):
    """Validate ESPHome YAML file structure and syntax"""
    
    print(f"🔍 Validating {yaml_file}...")
    
    try:
        # Load YAML with ESPHome support
        with open(yaml_file, 'r') as f:
            config = yaml.load(f, Loader=ESPHomeSecretLoader)
        
        print("✅ YAML syntax is valid")
        
        # Check required sections
        required_sections = ['esphome', 'esp32', 'wifi', 'logger', 'ota']
        optional_sections = ['api', 'web_server', 'sensor', 'gps', 'uart']
        missing_sections = []
        
        for section in required_sections:
            if section not in config:
                missing_sections.append(section)
            else:
                print(f"✅ Found section: {section}")
        
        if missing_sections:
            print(f"❌ Missing required sections: {', '.join(missing_sections)}")
            return False
            
        # Check ESPHome section fields
        esphome_config = config.get('esphome', {})
        required_fields = ['name', 'friendly_name']
        optional_fields = ['min_version', 'platform']
        
        for field in required_fields:
            if field not in esphome_config:
                print(f"❌ Missing esphome.{field}")
                return False
            else:
                value = esphome_config[field]
                print(f"✅ Found esphome.{field}: {value}")
                
        # Check ESP32 section for board
        esp32_config = config.get('esp32', {})
        if 'board' not in esp32_config:
            print("❌ Missing esp32.board")
            return False
        else:
            board = esp32_config['board']
            print(f"✅ Found esp32.board: {board}")
                
        # Additional validations
        if board not in ['nodemcu-32s', 'esp32dev', 'esp-wrover-kit', 'esp32-s3-devkitc-1']:
            print(f"⚠️  Unknown board type: {board}")
            
        print("✅ ESPHome configuration structure is valid")
        return True
        
    except yaml.YAMLError as e:
        print(f"❌ YAML syntax error: {e}")
        return False
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python validate_esphome.py <yaml_file>")
        sys.exit(1)
        
    yaml_file = sys.argv[1]
    
    if not os.path.exists(yaml_file):
        print(f"❌ File not found: {yaml_file}")
        sys.exit(1)
        
    if validate_esphome_yaml(yaml_file):
        print("🎉 Validation successful!")
        sys.exit(0)
    else:
        print("💥 Validation failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()